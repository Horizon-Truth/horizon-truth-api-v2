import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ContentModerationState,
  ContentVisibility,
} from '../entities/content-moderation-state.entity';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { ModerationActor } from '../moderation-actor';
import { ModerationAuditService } from './moderation-audit.service';

export interface ContentRef {
  targetType: ModerationTargetType;
  targetId: string;
  incidentReportId?: string | null;
  /** Text captured at action time so a restore can show what was removed. */
  snapshot?: string | null;
}

/**
 * Hide / delete / restore for any moderated object.
 *
 * The visibility overlay lives in `content_moderation_states` rather than in
 * each content table, so every content type gains the same three actions and
 * the same reversibility without touching its own schema.
 */
@Injectable()
export class ModerationContentService {
  constructor(
    @InjectRepository(ContentModerationState)
    private readonly stateRepo: Repository<ContentModerationState>,
    private readonly audit: ModerationAuditService,
  ) {}

  async hide(
    ref: ContentRef,
    actor: ModerationActor,
    reason: string,
  ): Promise<ContentModerationState> {
    return this.transition(
      ref,
      actor,
      reason,
      ContentVisibility.HIDDEN,
      ModerationActionType.CONTENT_HIDDEN,
    );
  }

  async remove(
    ref: ContentRef,
    actor: ModerationActor,
    reason: string,
  ): Promise<ContentModerationState> {
    return this.transition(
      ref,
      actor,
      reason,
      ContentVisibility.DELETED,
      ModerationActionType.CONTENT_DELETED,
    );
  }

  async restore(
    ref: ContentRef,
    actor: ModerationActor,
    reason: string,
  ): Promise<ContentModerationState> {
    const current = await this.stateRepo.findOne({
      where: { targetType: ref.targetType, targetId: ref.targetId },
    });

    if (!current || current.visibility === ContentVisibility.VISIBLE) {
      throw new ConflictException('This content is not hidden or deleted.');
    }

    return this.transition(
      ref,
      actor,
      reason,
      ContentVisibility.VISIBLE,
      ModerationActionType.CONTENT_RESTORED,
    );
  }

  async stateFor(
    targetType: ModerationTargetType,
    targetId: string,
  ): Promise<ContentModerationState | null> {
    return this.stateRepo.findOne({ where: { targetType, targetId } });
  }

  /** Visibility for many targets at once, keyed by target id. */
  async statesForMany(
    targetType: ModerationTargetType,
    targetIds: string[],
  ): Promise<Map<string, ContentVisibility>> {
    const map = new Map<string, ContentVisibility>();
    if (targetIds.length === 0) return map;

    const rows = await this.stateRepo.find({
      where: { targetType, targetId: In(targetIds) },
    });

    for (const row of rows) {
      map.set(row.targetId, row.visibility);
    }
    return map;
  }

  /**
   * True when the object should be withheld from non-moderators. Content
   * services call this before serving first-party objects.
   */
  async isSuppressed(
    targetType: ModerationTargetType,
    targetId: string,
  ): Promise<boolean> {
    const state = await this.stateFor(targetType, targetId);
    return !!state && state.visibility !== ContentVisibility.VISIBLE;
  }

  private async transition(
    ref: ContentRef,
    actor: ModerationActor,
    reason: string,
    visibility: ContentVisibility,
    action: ModerationActionType,
  ): Promise<ContentModerationState> {
    const existing = await this.stateRepo.findOne({
      where: { targetType: ref.targetType, targetId: ref.targetId },
    });

    const previousVisibility =
      existing?.visibility ?? ContentVisibility.VISIBLE;

    if (previousVisibility === visibility) {
      throw new ConflictException(
        `This content is already ${visibility.toLowerCase()}.`,
      );
    }

    const state =
      existing ??
      this.stateRepo.create({
        targetType: ref.targetType,
        targetId: ref.targetId,
      });

    state.visibility = visibility;
    state.reason = reason;
    state.actionedById = actor.userId;
    state.incidentReportId =
      ref.incidentReportId ?? state.incidentReportId ?? null;
    // Keep the first snapshot taken — it is the closest record of the content
    // as it was when it was first actioned.
    state.snapshot = state.snapshot ?? ref.snapshot ?? null;

    const saved = await this.stateRepo.save(state);

    await this.audit.record({
      actor,
      action,
      incidentReportId: ref.incidentReportId ?? null,
      reason,
      affectedObjectType: ref.targetType,
      affectedObjectId: ref.targetId,
      previousValue: { visibility: previousVisibility },
      newValue: { visibility },
    });

    return saved;
  }
}
