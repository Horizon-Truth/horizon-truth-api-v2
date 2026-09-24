import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { Session } from '../auth/entities/session.entity';
import { PlayerProfile } from '../players/entities/player-profile.entity';
import { PlayerLearningProfile } from '../players/entities/player-learning-profile.entity';
import { PlayerAction } from '../engine/entities/player-action.entity';
import { GameProgress } from '../engine/entities/game-progress.entity';
import { PlayerScenarioRecord } from '../engine/entities/player-scenario-record.entity';
import { PlayerSceneEvent } from '../analytics/entities/player-scene-event.entity';
import { PlayerAlgorithmProfile } from '../analytics/entities/player-algorithm-profile.entity';
import { UserBadge } from '../gamification/entities/user-badge.entity';
import { Leaderboard } from '../gamification/entities/leaderboard.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { OrganizationUser } from '../organizations/entities/organization-user.entity';
import { ModerationSavedFilter } from '../moderation/entities/moderation-saved-filter.entity';
import { ModerationNotification } from '../moderation/entities/moderation-notification.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../shared/enums/user-role.enum';
import { UserStatus } from '../shared/enums/user-status.enum';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Activity is written at most this often per user, so API traffic stays read-only. */
const ACTIVITY_WRITE_INTERVAL_MS = 60 * 60 * 1000;

/** Upper bound on accounts handled per job run; the rest are picked up next run. */
const BATCH_SIZE = 200;

export interface AccountLifecyclePolicy {
  /** Recovery window after a user asks for their account to be deleted. */
  deletionGraceDays: number;
  /** Inactivity after which a player account is erased. */
  inactiveDays: number;
  /** Minimum notice given before an inactive account is erased. */
  noticeDays: number;
}

export type PurgeReason = 'USER_REQUEST' | 'INACTIVITY' | 'ADMIN';

export interface LifecycleRunResult {
  purged: number;
  noticesSent: number;
  noticesFailed: number;
  schedulesCleared: number;
}

/**
 * Owns the end of an account's life:
 *
 * - **User-requested deletion** is a soft delete. The account is locked (sessions
 *   revoked, login refused) and can be restored for `deletionGraceDays`, after
 *   which it is erased.
 * - **Inactive accounts** are never erased because of their age. Only player
 *   accounts with no activity for `inactiveDays` are erased, and only after an
 *   email notice sent at least `noticeDays` earlier. Any sign-in or API use
 *   cancels the pending erasure.
 * - **Erasure** removes personal and gameplay data and leaves a de-identified
 *   tombstone `users` row. That row is kept because reports, evidence and
 *   moderation records reference it and must stay intact for other users.
 */
@Injectable()
export class AccountLifecycleService {
  private readonly logger = new Logger(AccountLifecycleService.name);
  readonly policy: AccountLifecyclePolicy;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.policy = {
      deletionGraceDays: this.positiveInt('ACCOUNT_DELETION_GRACE_DAYS', 30),
      inactiveDays: this.positiveInt('INACTIVE_ACCOUNT_DAYS', 730),
      noticeDays: this.positiveInt('INACTIVE_ACCOUNT_NOTICE_DAYS', 30),
    };
    if (this.policy.noticeDays >= this.policy.inactiveDays) {
      throw new Error(
        'INACTIVE_ACCOUNT_NOTICE_DAYS must be smaller than INACTIVE_ACCOUNT_DAYS',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // User-requested deletion
  // ---------------------------------------------------------------------------

  async requestDeletion(
    userId: string,
  ): Promise<{ deletionScheduledAt: Date }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.purgedAt) throw new NotFoundException('User not found');

    if (user.deletedAt && user.deletionScheduledAt) {
      return { deletionScheduledAt: user.deletionScheduledAt };
    }

    const now = new Date();
    const deletionScheduledAt = new Date(
      now.getTime() + this.policy.deletionGraceDays * DAY_MS,
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, userId, {
        deletedAt: now,
        deletionScheduledAt,
        inactivityNoticeSentAt: null,
        hashedRefreshToken: null,
      });
      await manager.update(Session, { userId }, { isActive: false });
    });

    if (user.email) {
      await this.sendBestEffort(
        user.email,
        'Your Horizon Truth account is scheduled for deletion',
        [
          `Hi ${user.fullName},`,
          '',
          `We received your request to delete your Horizon Truth account. It will be permanently deleted on ${this.formatDate(deletionScheduledAt)}.`,
          '',
          `Changed your mind? Sign in before then and choose "Restore my account": ${this.frontendUrl()}/login`,
          '',
          'After that date your personal information and game progress are erased and cannot be recovered.',
        ],
      );
    }

    return { deletionScheduledAt };
  }

  /**
   * Cancels a pending deletion. Allowed until the account has been erased,
   * even if the scheduled date has passed but the job has not run yet.
   */
  async restore(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.purgedAt || user.status === UserStatus.ANONYMIZED) {
      throw new GoneException(
        'This account has been permanently deleted and cannot be restored.',
      );
    }
    if (!user.deletedAt) {
      throw new BadRequestException(
        'This account is not scheduled for deletion.',
      );
    }

    await this.usersRepository.update(userId, {
      deletedAt: null,
      deletionScheduledAt: null,
      inactivityNoticeSentAt: null,
      lastActiveAt: new Date(),
    });
  }

  // ---------------------------------------------------------------------------
  // Activity tracking
  // ---------------------------------------------------------------------------

  /** Whether `user` (as loaded with default columns) needs its activity refreshed. */
  needsActivityUpdate(
    user: Pick<User, 'lastActiveAt' | 'deletedAt' | 'deletionScheduledAt'>,
    now = new Date(),
  ): boolean {
    if (user.deletedAt) return false;
    // A pending inactivity erasure must be cancelled right away.
    if (user.deletionScheduledAt) return true;
    if (!user.lastActiveAt) return true;
    return (
      now.getTime() - new Date(user.lastActiveAt).getTime() >=
      ACTIVITY_WRITE_INTERVAL_MS
    );
  }

  /**
   * Records that the user is active and cancels any pending inactivity
   * erasure. Accounts pending a user-requested deletion are left alone.
   */
  async markActive(
    userId: string,
    opts: { login?: boolean } = {},
  ): Promise<void> {
    const now = new Date();
    await this.usersRepository.update(
      { id: userId, deletedAt: IsNull() },
      {
        lastActiveAt: now,
        inactivityNoticeSentAt: null,
        deletionScheduledAt: null,
        ...(opts.login ? { lastLoginAt: now } : {}),
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Erasure
  // ---------------------------------------------------------------------------

  /**
   * Permanently erases an account's personal and gameplay data, leaving a
   * de-identified tombstone row. Idempotent; returns whether anything was erased.
   *
   * With `onlyIfDueBy`, the account is erased only if it is still scheduled for
   * erasure by then. The check runs under a row lock, so a sign-in that lands
   * while the job is running always wins.
   */
  async purge(
    userId: string,
    reason: PurgeReason,
    opts: { onlyIfDueBy?: Date } = {},
  ): Promise<boolean> {
    const purged = await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        select: [
          'id',
          'purgedAt',
          'deletedAt',
          'deletionScheduledAt',
          'lastActiveAt',
          'inactivityNoticeSentAt',
        ],
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.purgedAt) return false;
      if (opts.onlyIfDueBy && !this.isDue(user, opts.onlyIfDueBy)) return false;

      await this.eraseUserData(manager, userId);
      return true;
    });

    if (purged) this.logger.log(`Erased account ${userId} (${reason})`);
    return purged;
  }

  private isDue(
    user: Pick<
      User,
      | 'deletedAt'
      | 'deletionScheduledAt'
      | 'lastActiveAt'
      | 'inactivityNoticeSentAt'
    >,
    now: Date,
  ): boolean {
    if (!user.deletionScheduledAt || new Date(user.deletionScheduledAt) > now) {
      return false;
    }
    // User-requested deletions are due on schedule. Inactivity erasures also
    // need a notice and no activity since it.
    return !!user.deletedAt || this.stillInactiveAfterNotice(user);
  }

  private async eraseUserData(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    // Gameplay data. player_actions references game_progress, so it goes first.
    await manager.delete(PlayerAction, { userId });
    await manager.delete(GameProgress, { userId });
    await manager.delete(PlayerScenarioRecord, { userId });
    await manager.delete(PlayerSceneEvent, { userId });
    await manager.delete(PlayerAlgorithmProfile, { userId });
    await manager.delete(PlayerLearningProfile, { userId });
    await manager.delete(PlayerProfile, { userId });
    await manager.delete(UserBadge, { userId });
    await manager.delete(Leaderboard, { userId });

    // Personal data and free-text feedback.
    await manager.delete(Feedback, { userId });
    await manager.delete(Session, { userId });
    await manager.delete(UserActivity, { userId });
    await manager.delete(OrganizationUser, { userId });
    await manager.delete(ModerationSavedFilter, { ownerId: userId });
    await manager.delete(ModerationNotification, { recipientId: userId });

    // Audit entries are kept for accountability but lose network identifiers.
    await manager
      .createQueryBuilder()
      .update(AuditLog)
      .set({ ipAddress: () => 'NULL', userAgent: () => 'NULL' })
      .where('user_id = :userId', { userId })
      .execute();

    // Reports, evidence, verification votes and moderation records stay, now
    // attached to this de-identified row.
    const now = new Date();
    await manager.update(User, userId, {
      email: null,
      username: null,
      phone: null,
      passwordHash: null,
      apiKey: null,
      hashedRefreshToken: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      fullName: 'Deleted user',
      preferences: null,
      isVerified: false,
      status: UserStatus.ANONYMIZED,
      lastLoginAt: null,
      lastActiveAt: null,
      inactivityNoticeSentAt: null,
      deletionScheduledAt: null,
      deletedAt: now,
      purgedAt: now,
    });
  }

  // ---------------------------------------------------------------------------
  // Scheduled job
  // ---------------------------------------------------------------------------

  async runOnce(now = new Date()): Promise<LifecycleRunResult> {
    const result: LifecycleRunResult = {
      purged: 0,
      noticesSent: 0,
      noticesFailed: 0,
      schedulesCleared: 0,
    };

    await this.scheduleLegacyDeletions(now);
    await this.purgeDueAccounts(now, result);
    await this.sendInactivityNotices(now, result);

    if (
      result.purged ||
      result.noticesSent ||
      result.noticesFailed ||
      result.schedulesCleared
    ) {
      this.logger.log(`Account lifecycle run: ${JSON.stringify(result)}`);
    }
    return result;
  }

  /** Soft-deleted accounts from before the recovery window existed get the full window from now. */
  private async scheduleLegacyDeletions(now: Date): Promise<void> {
    await this.usersRepository.update(
      {
        deletedAt: Not(IsNull()),
        deletionScheduledAt: IsNull(),
        purgedAt: IsNull(),
        status: Not(UserStatus.ANONYMIZED),
      },
      {
        deletionScheduledAt: new Date(
          now.getTime() + this.policy.deletionGraceDays * DAY_MS,
        ),
      },
    );
  }

  private async purgeDueAccounts(
    now: Date,
    result: LifecycleRunResult,
  ): Promise<void> {
    const due = await this.usersRepository.find({
      where: { deletionScheduledAt: LessThanOrEqual(now), purgedAt: IsNull() },
      select: [
        'id',
        'deletedAt',
        'deletionScheduledAt',
        'lastActiveAt',
        'inactivityNoticeSentAt',
      ],
      take: BATCH_SIZE,
    });

    for (const user of due) {
      if (!this.isDue(user, now)) {
        // Activity after the notice should already have cleared this; never
        // erase on a stale schedule.
        await this.usersRepository.update(
          { id: user.id, deletedAt: IsNull() },
          { deletionScheduledAt: null, inactivityNoticeSentAt: null },
        );
        result.schedulesCleared++;
        continue;
      }

      try {
        const reason = user.deletedAt ? 'USER_REQUEST' : 'INACTIVITY';
        if (await this.purge(user.id, reason, { onlyIfDueBy: now })) {
          result.purged++;
        }
      } catch (err) {
        this.logger.error(
          `Failed to erase account ${user.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  private stillInactiveAfterNotice(
    user: Pick<User, 'lastActiveAt' | 'inactivityNoticeSentAt'>,
  ): boolean {
    if (!user.inactivityNoticeSentAt) return false;
    if (!user.lastActiveAt) return true;
    return new Date(user.lastActiveAt) < new Date(user.inactivityNoticeSentAt);
  }

  private async sendInactivityNotices(
    now: Date,
    result: LifecycleRunResult,
  ): Promise<void> {
    if (!this.mailService.isConfigured) {
      // No notice means no erasure: without email, inactive accounts are kept.
      this.logger.warn('Mail is not configured; skipping inactivity notices.');
      return;
    }

    const { inactiveDays, noticeDays } = this.policy;
    const noticeCutoff = new Date(
      now.getTime() - (inactiveDays - noticeDays) * DAY_MS,
    );

    // Accounts that predate activity tracking fall back to their newest
    // session, activity or gameplay row, so returning players are never
    // mistaken for inactive ones.
    const candidates: Array<{
      id: string;
      email: string;
      full_name: string;
      last_seen: Date;
    }> = await this.usersRepository.query(
      `
      SELECT id, email, full_name, last_seen FROM (
        SELECT u.id, u.email, u.full_name,
          COALESCE(u.last_active_at, GREATEST(
            u.created_at,
            u.last_login_at,
            (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id),
            (SELECT MAX(a.created_at) FROM user_activities a WHERE a.user_id = u.id),
            (SELECT MAX(p.created_at) FROM player_actions p WHERE p.user_id = u.id)
          )) AS last_seen
        FROM users u
        WHERE u.role = $1
          AND u.status <> $2
          AND u.deleted_at IS NULL
          AND u.purged_at IS NULL
          AND u.deletion_scheduled_at IS NULL
          AND u.email IS NOT NULL
      ) c
      WHERE c.last_seen < $3
      ORDER BY c.last_seen
      LIMIT $4
      `,
      [UserRole.PLAYER, UserStatus.ANONYMIZED, noticeCutoff, BATCH_SIZE],
    );

    for (const candidate of candidates) {
      const lastSeen = new Date(candidate.last_seen);
      // Candidates are picked `noticeDays` before they cross the threshold, so
      // this is at the threshold for a job running on schedule, and later for
      // accounts that were already past it: everyone gets the full notice.
      const deletionScheduledAt = new Date(now.getTime() + noticeDays * DAY_MS);

      try {
        await this.mailService.send({
          to: candidate.email,
          subject:
            'Your Horizon Truth account will be deleted due to inactivity',
          ...this.renderEmail([
            `Hi ${candidate.full_name},`,
            '',
            `We haven't seen you on Horizon Truth since ${this.formatDate(lastSeen)}. To protect your privacy we delete accounts that have been inactive for ${Math.round((inactiveDays / 365) * 10) / 10} years.`,
            '',
            `Your account and game progress will be permanently deleted on ${this.formatDate(deletionScheduledAt)}.`,
            '',
            `To keep your account, just sign in before then: ${this.frontendUrl()}/login`,
          ]),
        });
      } catch (err) {
        // Left unmarked, so the notice is retried on the next run.
        result.noticesFailed++;
        this.logger.error(
          `Failed to send inactivity notice for ${candidate.id}: ${(err as Error).message}`,
        );
        continue;
      }

      await this.usersRepository.update(
        { id: candidate.id, deletedAt: IsNull() },
        { inactivityNoticeSentAt: now, deletionScheduledAt },
      );
      result.noticesSent++;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async sendBestEffort(
    to: string,
    subject: string,
    lines: string[],
  ): Promise<void> {
    try {
      await this.mailService.send({ to, subject, ...this.renderEmail(lines) });
    } catch (err) {
      this.logger.warn(
        `Could not send "${subject}" email: ${(err as Error).message}`,
      );
    }
  }

  private renderEmail(lines: string[]): { text: string; html: string } {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const linkify = (s: string) =>
      s.replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');
    const html = lines
      .join('\n')
      .split('\n\n')
      .map((p) => `<p>${linkify(escape(p)).replace(/\n/g, '<br>')}</p>`)
      .join('');
    return { text: lines.join('\n'), html };
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  private frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      'https://horizontruth.org'
    );
  }

  private positiveInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(
        `${key} must be a positive whole number of days (got "${raw}")`,
      );
    }
    return value;
  }
}
