import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { UserSanction } from '../entities/user-sanction.entity';
import { ModerationNote } from '../entities/moderation-note.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { ModerationAppeal } from '../entities/moderation-appeal.entity';
import { ModerationNotificationType } from '../entities/moderation-notification.entity';

import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import {
  SANCTION_RISK_WEIGHT,
  UserSanctionStatus,
  UserSanctionType,
} from '../../shared/enums/user-sanction.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { APPEAL_WINDOW_DAYS } from '../../shared/enums/moderation-appeal.enum';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';

import {
  RestoreUserDto,
  SuspendUserDto,
  WarnUserDto,
} from '../dto/user-actions.dto';
import { ModerationActor, actorCan } from '../moderation-actor';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

/** Risk contribution of one upheld report against the user. */
const UPHELD_REPORT_WEIGHT = 8;
/** Risk decays: sanctions older than this contribute at half weight. */
const RISK_DECAY_DAYS = 180;
const MAX_RISK_SCORE = 100;

/**
 * User-facing moderation: warnings, suspensions, bans, restoration, and the
 * violation record that informs those decisions.
 *
 * Enforcement is deliberately layered — warning, temporary suspension,
 * permanent suspension, ban — and each step up requires a broader permission,
 * so escalation is a policy decision rather than a UI affordance.
 */
@Injectable()
export class ModerationUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSanction)
    private readonly sanctionRepo: Repository<UserSanction>,
    @InjectRepository(IncidentReport)
    private readonly caseRepo: Repository<IncidentReport>,
    @InjectRepository(ModerationNote)
    private readonly noteRepo: Repository<ModerationNote>,
    @InjectRepository(ModerationAppeal)
    private readonly appealRepo: Repository<ModerationAppeal>,
    private readonly dataSource: DataSource,
    private readonly audit: ModerationAuditService,
    private readonly notifications: ModerationNotificationsService,
  ) {}

  // =======================================================================
  // Profile
  // =======================================================================

  /** Everything a moderator needs to judge one account. */
  async getModerationProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [sanctions, reportsAgainst, reportsFiled, appeals, notes] =
      await Promise.all([
        this.sanctionRepo.find({
          where: { userId },
          relations: ['issuedBy'],
          order: { createdAt: 'DESC' },
        }),
        this.caseRepo.find({
          where: { reportedUserId: userId },
          order: { createdAt: 'DESC' },
          take: 50,
        }),
        this.caseRepo.count({ where: { reportedByUserId: userId } }),
        this.appealRepo.find({
          where: { appellantId: userId },
          order: { createdAt: 'DESC' },
        }),
        this.noteRepo.find({
          where: { targetId: userId, deletedAt: IsNull() },
          relations: ['author'],
          order: { createdAt: 'DESC' },
        }),
      ]);

    const upheld = reportsAgainst.filter(
      (c) => c.status === ModerationCaseStatus.RESOLVED,
    );
    const dismissed = reportsAgainst.filter(
      (c) => c.status === ModerationCaseStatus.DISMISSED,
    );

    const activeSanctions = sanctions.filter(
      (s) => s.status === UserSanctionStatus.ACTIVE,
    );

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      counts: {
        reportsReceived: reportsAgainst.length,
        reportsUpheld: upheld.length,
        reportsDismissed: dismissed.length,
        reportsFiled,
        warnings: sanctions.filter((s) => s.type === UserSanctionType.WARNING)
          .length,
        suspensions: sanctions.filter(
          (s) =>
            s.type === UserSanctionType.TEMPORARY_SUSPENSION ||
            s.type === UserSanctionType.PERMANENT_SUSPENSION,
        ).length,
        bans: sanctions.filter((s) => s.type === UserSanctionType.BAN).length,
        appeals: appeals.length,
        appealsUpheld: appeals.filter((a) => a.status === 'ACCEPTED').length,
      },
      riskScore: this.computeRiskScore(sanctions, upheld.length),
      activeSanctions,
      sanctionHistory: sanctions,
      reportsAgainst,
      appeals,
      notes,
      timeline: this.buildUserTimeline(sanctions, reportsAgainst, appeals),
    };
  }

  /**
   * 0–100. Blends sanction weight, upheld reports against the account and a
   * time decay, so an account that has behaved for six months is not judged
   * forever on an old warning.
   */
  computeRiskScore(sanctions: UserSanction[], upheldReports: number): number {
    const now = Date.now();
    const decayMs = RISK_DECAY_DAYS * 24 * 60 * 60 * 1000;

    const sanctionScore = sanctions
      .filter((s) => s.status !== UserSanctionStatus.OVERTURNED)
      .reduce((total, s) => {
        const weight = SANCTION_RISK_WEIGHT[s.type] ?? 0;
        const age = now - new Date(s.createdAt).getTime();
        const factor = age > decayMs ? 0.5 : 1;
        return total + weight * factor;
      }, 0);

    const reportScore = upheldReports * UPHELD_REPORT_WEIGHT;

    return Math.min(MAX_RISK_SCORE, Math.round(sanctionScore + reportScore));
  }

  /**
   * What a user is allowed to see about moderation decisions concerning
   * *themselves*, so they can understand a sanction and appeal it.
   *
   * Deliberately narrower than `getModerationProfile`. Three things are
   * withheld:
   *
   * - **Internal notes.** Written for colleagues, not for the subject.
   * - **The issuing moderator's identity.** Naming the individual who
   *   sanctioned someone invites retaliation; the organisation owns the
   *   decision, not the person.
   * - **The risk score and other users' reports.** Operational signals, and
   *   exposing them would let someone probe how close they are to a ban.
   */
  async getOwnRecord(userId: string) {
    const [sanctions, appeals] = await Promise.all([
      this.sanctionRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      }),
      this.appealRepo.find({
        where: { appellantId: userId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const appealedSanctionIds = new Set(
      appeals
        .map((a) => a.sanctionId)
        .filter((id): id is string => typeof id === 'string'),
    );

    return {
      sanctions: sanctions.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        reason: s.reason,
        expiresAt: s.expiresAt ?? null,
        createdAt: s.createdAt,
        liftedAt: s.liftedAt ?? null,
        // Drives whether the client offers an "Appeal" button.
        isAppealable: this.isAppealable(s, appealedSanctionIds),
      })),
      appeals: appeals.map((a) => ({
        id: a.id,
        appealNumber: a.appealNumber,
        subjectType: a.subjectType,
        sanctionId: a.sanctionId ?? null,
        incidentReportId: a.incidentReportId ?? null,
        reason: a.reason,
        status: a.status,
        moderatorResponse: a.moderatorResponse ?? null,
        reviewedAt: a.reviewedAt ?? null,
        createdAt: a.createdAt,
      })),
      appealWindowDays: APPEAL_WINDOW_DAYS,
    };
  }

  /**
   * Mirrors the checks in `ModerationAppealsService.submit`, so the UI never
   * offers an appeal the API would then refuse.
   */
  private isAppealable(
    sanction: UserSanction,
    alreadyAppealed: Set<string>,
  ): boolean {
    if (sanction.status === UserSanctionStatus.OVERTURNED) return false;
    if (alreadyAppealed.has(sanction.id)) return false;

    const ageDays =
      (Date.now() - new Date(sanction.createdAt).getTime()) / 86_400_000;

    return ageDays <= APPEAL_WINDOW_DAYS;
  }

  // =======================================================================
  // Enforcement
  // =======================================================================

  async warn(userId: string, dto: WarnUserDto, actor: ModerationActor) {
    const user = await this.requireModeratableUser(userId, actor);

    const sanction = await this.sanctionRepo.save(
      this.sanctionRepo.create({
        userId,
        type: UserSanctionType.WARNING,
        status: UserSanctionStatus.ACTIVE,
        reason: dto.reason,
        notes: dto.notes ?? null,
        issuedById: actor.userId,
        incidentReportId: dto.incidentReportId ?? null,
        previousUserStatus: user.status,
      }),
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.USER_WARNED,
      incidentReportId: dto.incidentReportId ?? null,
      reason: dto.reason,
      notes: dto.notes,
      affectedObjectType: 'user',
      affectedObjectId: userId,
      previousValue: { status: user.status },
      newValue: { sanction: UserSanctionType.WARNING, sanctionId: sanction.id },
    });

    await this.notifications.notify({
      recipientId: userId,
      type: ModerationNotificationType.WARNING_ISSUED,
      title: 'You have received a moderation warning',
      body: dto.reason,
      link: '/dashboard/profile',
      email: true,
      metadata: { sanctionId: sanction.id },
    });

    return sanction;
  }

  async suspend(userId: string, dto: SuspendUserDto, actor: ModerationActor) {
    const user = await this.requireModeratableUser(userId, actor);

    const isPermanent = dto.permanent === true || dto.ban === true;

    if (!isPermanent && !dto.durationDays) {
      throw new BadRequestException(
        'Provide durationDays, or set permanent/ban for an indefinite suspension.',
      );
    }

    if (!actorCan(actor, ModerationPermission.SUSPEND_USERS)) {
      throw new ForbiddenException(
        'Suspending an account requires the SUSPEND_USERS permission.',
      );
    }

    if (isPermanent && !actorCan(actor, ModerationPermission.BAN_USERS)) {
      throw new ForbiddenException(
        'Permanent suspensions and bans require the BAN_USERS permission.',
      );
    }

    const existing = await this.sanctionRepo.findOne({
      where: {
        userId,
        status: UserSanctionStatus.ACTIVE,
        type: In([
          UserSanctionType.TEMPORARY_SUSPENSION,
          UserSanctionType.PERMANENT_SUSPENSION,
          UserSanctionType.BAN,
        ]),
      },
    });

    if (existing) {
      throw new ConflictException(
        'This account already has an active suspension. Restore it first, ' +
          'or extend the existing sanction.',
      );
    }

    const type = dto.ban
      ? UserSanctionType.BAN
      : isPermanent
        ? UserSanctionType.PERMANENT_SUSPENSION
        : UserSanctionType.TEMPORARY_SUSPENSION;

    const expiresAt = isPermanent
      ? null
      : new Date(Date.now() + (dto.durationDays as number) * 86_400_000);

    const previousStatus = user.status;

    const sanction = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(UserSanction, {
          userId,
          type,
          status: UserSanctionStatus.ACTIVE,
          reason: dto.reason,
          notes: dto.notes ?? null,
          expiresAt,
          issuedById: actor.userId,
          incidentReportId: dto.incidentReportId ?? null,
          previousUserStatus: previousStatus,
        }),
      );

      await manager.update(
        User,
        { id: userId },
        { status: UserStatus.SUSPENDED },
      );

      return created;
    });

    await this.audit.record({
      actor,
      action:
        type === UserSanctionType.BAN
          ? ModerationActionType.USER_BANNED
          : ModerationActionType.USER_SUSPENDED,
      incidentReportId: dto.incidentReportId ?? null,
      reason: dto.reason,
      notes: dto.notes,
      affectedObjectType: 'user',
      affectedObjectId: userId,
      previousValue: { status: previousStatus },
      newValue: {
        status: UserStatus.SUSPENDED,
        sanction: type,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    await this.notifications.notify({
      recipientId: userId,
      type: ModerationNotificationType.ACCOUNT_SUSPENDED,
      title:
        type === UserSanctionType.BAN
          ? 'Your account has been banned'
          : 'Your account has been suspended',
      body: expiresAt
        ? `${dto.reason}\n\nYour suspension ends on ${expiresAt.toDateString()}.`
        : dto.reason,
      link: '/dashboard/profile',
      email: true,
      metadata: { sanctionId: sanction.id },
    });

    return sanction;
  }

  /** Lift one sanction, or every active sanction on the account. */
  async restore(userId: string, dto: RestoreUserDto, actor: ModerationActor) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const active = await this.sanctionRepo.find({
      where: {
        userId,
        status: UserSanctionStatus.ACTIVE,
        ...(dto.sanctionId ? { id: dto.sanctionId } : {}),
      },
    });

    if (active.length === 0) {
      throw new ConflictException(
        'This account has no active sanction to lift.',
      );
    }

    const now = new Date();
    // Prefer the status recorded before the *earliest* live sanction — that is
    // the state the account was actually in before enforcement began.
    const restoreTo =
      [...active].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0].previousUserStatus ?? UserStatus.ACTIVE;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        UserSanction,
        { id: In(active.map((s) => s.id)) },
        {
          status: UserSanctionStatus.REVOKED,
          liftedAt: now,
          liftedById: actor.userId,
          liftReason: dto.reason,
        },
      );

      const stillSuspended = await manager.count(UserSanction, {
        where: {
          userId,
          status: UserSanctionStatus.ACTIVE,
          type: In([
            UserSanctionType.TEMPORARY_SUSPENSION,
            UserSanctionType.PERMANENT_SUSPENSION,
            UserSanctionType.BAN,
          ]),
        },
      });

      if (stillSuspended === 0) {
        await manager.update(
          User,
          { id: userId },
          { status: restoreTo as UserStatus },
        );
      }
    });

    await this.audit.record({
      actor,
      action: ModerationActionType.USER_RESTORED,
      reason: dto.reason,
      notes: dto.notes,
      affectedObjectType: 'user',
      affectedObjectId: userId,
      previousValue: {
        status: user.status,
        sanctions: active.map((s) => s.id),
      },
      newValue: { status: restoreTo },
    });

    await this.notifications.notify({
      recipientId: userId,
      type: ModerationNotificationType.ACCOUNT_RESTORED,
      title: 'Your account has been restored',
      body: dto.reason,
      link: '/dashboard',
      email: true,
    });

    return { restored: active.length, status: restoreTo };
  }

  /**
   * Expire temporary suspensions whose end date has passed and return the
   * accounts to their previous status.
   *
   * Called on demand by the dashboard rather than on a timer, so the module
   * carries no scheduler dependency; a cron can call the same endpoint.
   */
  async expireDueSanctions(): Promise<{ expired: number }> {
    const due = await this.sanctionRepo.find({
      where: {
        status: UserSanctionStatus.ACTIVE,
        type: UserSanctionType.TEMPORARY_SUSPENSION,
        expiresAt: LessThanOrEqual(new Date()),
      },
    });

    if (due.length === 0) return { expired: 0 };

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        UserSanction,
        { id: In(due.map((s) => s.id)) },
        { status: UserSanctionStatus.EXPIRED, liftedAt: new Date() },
      );

      for (const sanction of due) {
        const remaining = await manager.count(UserSanction, {
          where: {
            userId: sanction.userId,
            status: UserSanctionStatus.ACTIVE,
            type: In([
              UserSanctionType.TEMPORARY_SUSPENSION,
              UserSanctionType.PERMANENT_SUSPENSION,
              UserSanctionType.BAN,
            ]),
          },
        });

        if (remaining === 0) {
          await manager.update(
            User,
            { id: sanction.userId },
            {
              status: (sanction.previousUserStatus ??
                UserStatus.ACTIVE) as UserStatus,
            },
          );
        }
      }
    });

    for (const sanction of due) {
      await this.notifications.notify({
        recipientId: sanction.userId,
        type: ModerationNotificationType.ACCOUNT_RESTORED,
        title: 'Your suspension has ended',
        body: 'Your account is active again. Please review the community guidelines.',
        link: '/dashboard',
        email: true,
      });
    }

    return { expired: due.length };
  }

  /** Moderators available to take an assignment, with their current load. */
  async listModerators() {
    const moderators = await this.userRepo.find({
      where: {
        role: In([
          UserRole.MODERATOR,
          UserRole.SENIOR_MODERATOR,
          UserRole.ORG_ADMIN,
          UserRole.SYSTEM_ADMIN,
        ]),
        deletedAt: IsNull(),
      },
      select: ['id', 'fullName', 'username', 'email', 'role', 'lastLoginAt'],
      order: { fullName: 'ASC' },
    });

    const workloads = await this.caseRepo
      .createQueryBuilder('c')
      .select('c.assignedModeratorId', 'moderatorId')
      .addSelect('COUNT(*)::int', 'openCases')
      .where('c.assignedModeratorId IS NOT NULL')
      .andWhere('c.status NOT IN (:...terminal)', {
        terminal: [
          ModerationCaseStatus.RESOLVED,
          ModerationCaseStatus.DISMISSED,
          ModerationCaseStatus.CLOSED,
          ModerationCaseStatus.DUPLICATE,
        ],
      })
      .groupBy('c.assignedModeratorId')
      .getRawMany<{ moderatorId: string; openCases: number }>();

    const loadById = new Map(
      workloads.map((w) => [w.moderatorId, Number(w.openCases)]),
    );

    return moderators.map((m) => ({
      ...m,
      openCases: loadById.get(m.id) ?? 0,
    }));
  }

  // =======================================================================
  // Internals
  // =======================================================================

  /**
   * Guard against a moderator acting on themselves or on an account at or
   * above their own level — an administrator cannot be suspended by a
   * moderator, and only a system administrator can sanction another admin.
   */
  private async requireModeratableUser(
    userId: string,
    actor: ModerationActor,
  ): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.id === actor.userId) {
      throw new BadRequestException(
        'You cannot apply a moderation action to your own account.',
      );
    }

    const rank: Record<UserRole, number> = {
      [UserRole.PLAYER]: 0,
      [UserRole.MODERATOR]: 1,
      [UserRole.SENIOR_MODERATOR]: 2,
      [UserRole.ORG_ADMIN]: 3,
      [UserRole.SYSTEM_ADMIN]: 4,
    };

    if (rank[user.role] >= rank[actor.role]) {
      throw new ForbiddenException(
        'You cannot apply a moderation action to an account at or above ' +
          'your own permission level. Escalate instead.',
      );
    }

    return user;
  }

  private buildUserTimeline(
    sanctions: UserSanction[],
    cases: IncidentReport[],
    appeals: ModerationAppeal[],
  ) {
    const events = [
      ...sanctions.map((s) => ({
        kind: 'SANCTION' as const,
        id: s.id,
        at: s.createdAt,
        label: s.type,
        detail: s.reason,
        status: s.status,
      })),
      ...cases.map((c) => ({
        kind: 'REPORT' as const,
        id: c.id,
        at: c.createdAt,
        label: c.reportReason,
        detail: c.description,
        status: c.status,
      })),
      ...appeals.map((a) => ({
        kind: 'APPEAL' as const,
        id: a.id,
        at: a.createdAt,
        label: a.subjectType,
        detail: a.reason,
        status: a.status,
      })),
    ];

    return events.sort((a, b) => b.at.getTime() - a.at.getTime());
  }
}
