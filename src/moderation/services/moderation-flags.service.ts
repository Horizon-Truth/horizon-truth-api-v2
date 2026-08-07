import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ModerationFlag } from '../entities/moderation-flag.entity';
import { ModerationFlagAssignment } from '../entities/moderation-flag-assignment.entity';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import {
  FLAG_SEVERITY_WEIGHT,
  ModerationFlagSeverity,
} from '../../shared/enums/moderation-flag-type.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { CreateFlagDto, UpdateFlagDto } from '../dto/flag-catalogue.dto';
import { ModerationActor } from '../moderation-actor';
import { ModerationAuditService } from './moderation-audit.service';

export interface FlagTarget {
  targetType: ModerationTargetType;
  targetId: string;
  incidentReportId?: string | null;
}

/**
 * Owns the flag catalogue and the flags applied to content.
 *
 * Flags are additive — a target can carry many at once — and removal is a soft
 * clear so the history of what was flagged survives.
 */
@Injectable()
export class ModerationFlagsService {
  constructor(
    @InjectRepository(ModerationFlag)
    private readonly flagRepo: Repository<ModerationFlag>,
    @InjectRepository(ModerationFlagAssignment)
    private readonly assignmentRepo: Repository<ModerationFlagAssignment>,
    private readonly audit: ModerationAuditService,
  ) {}

  // --- Catalogue ---------------------------------------------------------

  async listCatalogue(includeInactive = false): Promise<ModerationFlag[]> {
    return this.flagRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<ModerationFlag> {
    const flag = await this.flagRepo.findOne({ where: { code } });
    if (!flag) {
      throw new NotFoundException(`Unknown flag code: ${code}`);
    }
    return flag;
  }

  async createFlag(dto: CreateFlagDto): Promise<ModerationFlag> {
    const existing = await this.flagRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(
        `A flag with code ${dto.code} already exists.`,
      );
    }
    return this.flagRepo.save(this.flagRepo.create(dto));
  }

  async updateFlag(id: string, dto: UpdateFlagDto): Promise<ModerationFlag> {
    const flag = await this.flagRepo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Flag not found');

    Object.assign(flag, dto);
    return this.flagRepo.save(flag);
  }

  /**
   * System flags are never deleted — analytics and historical assignments
   * depend on their codes — so they are deactivated instead.
   */
  async deleteFlag(
    id: string,
  ): Promise<{ deleted: boolean; deactivated: boolean }> {
    const flag = await this.flagRepo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Flag not found');

    if (flag.isSystem) {
      flag.isActive = false;
      await this.flagRepo.save(flag);
      return { deleted: false, deactivated: true };
    }

    const inUse = await this.assignmentRepo.count({ where: { flagId: id } });
    if (inUse > 0) {
      flag.isActive = false;
      await this.flagRepo.save(flag);
      return { deleted: false, deactivated: true };
    }

    await this.flagRepo.delete(id);
    return { deleted: true, deactivated: false };
  }

  // --- Assignment --------------------------------------------------------

  /**
   * Apply one or more flags to a target. Codes already live on the target are
   * skipped rather than treated as an error, so a double-submit is harmless.
   */
  async applyFlags(
    target: FlagTarget,
    codes: string[],
    actor: ModerationActor,
    reason: string,
  ): Promise<ModerationFlagAssignment[]> {
    const unique = [...new Set(codes)];
    if (unique.length === 0) {
      throw new BadRequestException('At least one flag code is required.');
    }

    const flags = await this.flagRepo.find({
      where: { code: In(unique), isActive: true },
    });

    const found = new Set(flags.map((f) => f.code));
    const missing = unique.filter((c) => !found.has(c));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown or inactive flag code(s): ${missing.join(', ')}`,
      );
    }

    const alreadyApplied = await this.assignmentRepo.find({
      where: {
        targetType: target.targetType,
        targetId: target.targetId,
        flagId: In(flags.map((f) => f.id)),
        removedAt: IsNull(),
      },
    });
    const liveFlagIds = new Set(alreadyApplied.map((a) => a.flagId));

    const toCreate = flags.filter((f) => !liveFlagIds.has(f.id));
    if (toCreate.length === 0) {
      return alreadyApplied;
    }

    const created = await this.assignmentRepo.save(
      toCreate.map((flag) =>
        this.assignmentRepo.create({
          flagId: flag.id,
          targetType: target.targetType,
          targetId: target.targetId,
          incidentReportId: target.incidentReportId ?? null,
          appliedById: actor.userId,
          reason,
        }),
      ),
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.CONTENT_FLAGGED,
      incidentReportId: target.incidentReportId ?? null,
      reason,
      affectedObjectType: target.targetType,
      affectedObjectId: target.targetId,
      previousValue: { flags: [...liveFlagIds] },
      newValue: { flags: toCreate.map((f) => f.code) },
    });

    return [...alreadyApplied, ...created];
  }

  async removeFlag(
    assignmentId: string,
    actor: ModerationActor,
    reason: string,
  ): Promise<ModerationFlagAssignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['flag'],
    });

    if (!assignment) throw new NotFoundException('Flag assignment not found');
    if (assignment.removedAt) {
      throw new ConflictException('This flag has already been removed.');
    }

    assignment.removedAt = new Date();
    assignment.removedById = actor.userId;
    assignment.removalReason = reason;

    const saved = await this.assignmentRepo.save(assignment);

    await this.audit.record({
      actor,
      action: ModerationActionType.CONTENT_UNFLAGGED,
      incidentReportId: assignment.incidentReportId ?? null,
      reason,
      affectedObjectType: assignment.targetType,
      affectedObjectId: assignment.targetId,
      previousValue: { flag: assignment.flag?.code },
      newValue: { flag: null },
    });

    return saved;
  }

  /** Live flags on a target, newest first. */
  async flagsFor(
    targetType: ModerationTargetType,
    targetId: string,
    includeRemoved = false,
  ): Promise<ModerationFlagAssignment[]> {
    return this.assignmentRepo.find({
      where: {
        targetType,
        targetId,
        ...(includeRemoved ? {} : { removedAt: IsNull() }),
      },
      relations: ['flag', 'appliedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Live flags for many targets at once, keyed by target id.
   *
   * The queue renders flags for a whole page of cases; without this the list
   * would issue one query per row.
   */
  async flagsForMany(
    targetType: ModerationTargetType,
    targetIds: string[],
  ): Promise<Map<string, ModerationFlagAssignment[]>> {
    const grouped = new Map<string, ModerationFlagAssignment[]>();
    if (targetIds.length === 0) return grouped;

    const rows = await this.assignmentRepo.find({
      where: {
        targetType,
        targetId: In(targetIds),
        removedAt: IsNull(),
      },
      relations: ['flag'],
      order: { createdAt: 'DESC' },
    });

    for (const row of rows) {
      const bucket = grouped.get(row.targetId) ?? [];
      bucket.push(row);
      grouped.set(row.targetId, bucket);
    }

    return grouped;
  }

  /**
   * Combined weight of the live flags on a target. Feeds the user risk score
   * and the queue's default ordering.
   */
  async severityWeightFor(
    targetType: ModerationTargetType,
    targetId: string,
  ): Promise<number> {
    const live = await this.flagsFor(targetType, targetId);
    return live.reduce(
      (total, a) =>
        total +
        (FLAG_SEVERITY_WEIGHT[
          a.flag?.severity ?? ModerationFlagSeverity.MEDIUM
        ] ?? 0),
      0,
    );
  }
}
