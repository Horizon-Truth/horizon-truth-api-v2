import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ModerationAction } from '../../incidents/entities/moderation-action.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  ModerationActionType,
  REASON_REQUIRED_ACTIONS,
} from '../../shared/enums/moderation-action-type.enum';
import { ModerationActor } from '../moderation-actor';

export interface RecordActionInput {
  actor: ModerationActor;
  action: ModerationActionType;
  incidentReportId?: string | null;
  reason?: string | null;
  notes?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  affectedObjectType?: string | null;
  affectedObjectId?: string | null;
  /** Run inside a caller-supplied transaction when one is open. */
  manager?: EntityManager;
}

/**
 * Single writer for the moderation trail.
 *
 * Every state change in the module goes through `record`, which appends an
 * immutable `moderation_actions` row and mirrors it into `audit_logs`. Callers
 * never write either table directly, so "who / when / what changed / why"
 * cannot be omitted by accident.
 */
@Injectable()
export class ModerationAuditService {
  private readonly logger = new Logger(ModerationAuditService.name);

  constructor(
    @InjectRepository(ModerationAction)
    private readonly actionRepo: Repository<ModerationAction>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async record(input: RecordActionInput): Promise<ModerationAction> {
    const {
      actor,
      action,
      incidentReportId = null,
      reason = null,
      notes = null,
      previousValue = null,
      newValue = null,
      affectedObjectType = null,
      affectedObjectId = null,
      manager,
    } = input;

    if (REASON_REQUIRED_ACTIONS.includes(action) && !reason?.trim()) {
      throw new BadRequestException(
        `A written reason is required for the action ${action}.`,
      );
    }

    const repo = manager
      ? manager.getRepository(ModerationAction)
      : this.actionRepo;

    const entity = new ModerationAction();
    entity.incidentReportId = incidentReportId;
    entity.moderatorUserId = actor.userId;
    entity.action = action;
    entity.reason = reason;
    entity.notes = notes as string;
    entity.previousValue = previousValue;
    entity.newValue = newValue;
    entity.affectedObjectType = affectedObjectType;
    entity.affectedObjectId = affectedObjectId;
    entity.ipAddress = actor.ipAddress ?? null;
    entity.userAgent = actor.userAgent ?? null;

    const saved = await repo.save(entity);

    // The platform-wide trail is best-effort: losing a mirror row must never
    // roll back the moderation action that was already committed.
    try {
      await this.auditLogs.createLog({
        userId: actor.userId,
        action: `MODERATION ${action}`,
        entityType: affectedObjectType ?? 'moderation_case',
        entityId: affectedObjectId ?? incidentReportId ?? saved.id,
        reason,
        previousValue,
        newValue,
        metadata: { notes, moderationActionId: saved.id },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    } catch (error) {
      this.logger.error(
        `Failed to mirror moderation action ${saved.id} into audit_logs: ${
          (error as Error).message
        }`,
      );
    }

    return saved;
  }

  /** Timeline for one case, oldest first. */
  async timelineFor(incidentReportId: string): Promise<ModerationAction[]> {
    return this.actionRepo.find({
      where: { incidentReportId },
      relations: ['moderatorUser'],
      order: { createdAt: 'ASC' },
    });
  }

  /** Recent actions by one moderator, used by the analytics surface. */
  async actionsByModerator(
    moderatorUserId: string,
    limit = 50,
  ): Promise<ModerationAction[]> {
    return this.actionRepo.find({
      where: { moderatorUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
