import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import {
  ModerationNotification,
  ModerationNotificationType,
} from '../entities/moderation-notification.entity';
import { User } from '../../users/entities/user.entity';
import { MailService } from '../../mail/mail.service';
import { MODERATION_ROLES, UserRole } from '../../shared/enums/user-role.enum';

export interface NotifyInput {
  recipientId: string;
  type: ModerationNotificationType;
  title: string;
  body: string;
  link?: string;
  isUrgent?: boolean;
  metadata?: Record<string, unknown>;
  /** Also send an email, if the recipient has one and mail is configured. */
  email?: boolean;
}

/**
 * In-app notifications for moderators and for the users affected by
 * moderation decisions.
 *
 * Delivery is best-effort by design: a notification failure must never abort
 * the moderation action that triggered it, so every public method swallows and
 * logs its errors rather than throwing into the caller's transaction.
 */
@Injectable()
export class ModerationNotificationsService {
  private readonly logger = new Logger(ModerationNotificationsService.name);

  constructor(
    @InjectRepository(ModerationNotification)
    private readonly notificationRepo: Repository<ModerationNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: MailService,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    try {
      const saved = await this.notificationRepo.save(
        this.notificationRepo.create({
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link ?? null,
          isUrgent: input.isUrgent ?? false,
          metadata: input.metadata ?? null,
        }),
      );

      if (input.email) {
        await this.emailRecipient(input, saved);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify ${input.recipientId} (${input.type}): ${
          (error as Error).message
        }`,
      );
    }
  }

  /** Fan a notification out to every holder of the given roles. */
  async notifyRoles(
    roles: UserRole[],
    input: Omit<NotifyInput, 'recipientId'>,
    options: { excludeUserId?: string } = {},
  ): Promise<void> {
    try {
      const recipients = await this.userRepo.find({
        where: { role: In(roles), deletedAt: IsNull() },
        select: ['id'],
      });

      await Promise.all(
        recipients
          .filter((r) => r.id !== options.excludeUserId)
          .map((r) => this.notify({ ...input, recipientId: r.id })),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fan out ${input.type} to roles ${roles.join(', ')}: ${
          (error as Error).message
        }`,
      );
    }
  }

  /** Every moderator, senior moderator and administrator. */
  async notifyModerationTeam(
    input: Omit<NotifyInput, 'recipientId'>,
    options: { excludeUserId?: string } = {},
  ): Promise<void> {
    return this.notifyRoles(MODERATION_ROLES, input, options);
  }

  async listFor(
    recipientId: string,
    options: { unreadOnly?: boolean; page?: number; limit?: number } = {},
  ) {
    const { unreadOnly = false, page = 1, limit = 20 } = options;

    const [items, total] = await this.notificationRepo.findAndCount({
      where: {
        recipientId,
        ...(unreadOnly ? { readAt: IsNull() } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { recipientId, readAt: IsNull() },
    });

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async markRead(
    recipientId: string,
    ids: string[],
  ): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };

    const result = await this.notificationRepo.update(
      { recipientId, id: In(ids), readAt: IsNull() },
      { readAt: new Date() },
    );

    return { updated: result.affected ?? 0 };
  }

  async markAllRead(recipientId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo.update(
      { recipientId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  async unreadCount(recipientId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { recipientId, readAt: IsNull() },
    });
  }

  private async emailRecipient(
    input: NotifyInput,
    saved: ModerationNotification,
  ): Promise<void> {
    if (!this.mail.isConfigured) return;

    const recipient = await this.userRepo.findOne({
      where: { id: input.recipientId, email: Not(IsNull()) },
      select: ['id', 'email', 'fullName'],
    });

    if (!recipient?.email) return;

    await this.mail.send({
      to: recipient.email,
      subject: input.title,
      text: `${input.body}\n\nReference: ${saved.id}`,
    });
  }
}
