import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { randomBytes } from 'crypto';

import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { IncidentStatus } from '../../incidents/entities/incident-status.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationNote } from '../entities/moderation-note.entity';
import { ModerationFlagAssignment } from '../entities/moderation-flag-assignment.entity';

import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { IncidentSeverity } from '../../shared/enums/incident-severity.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { ModerationPermission } from '../../shared/enums/moderation-permission.enum';
import { ModerationTargetType } from '../../shared/enums/moderation-target-type.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { ModerationNotificationType } from '../entities/moderation-notification.entity';

import { CreateCaseDto } from '../dto/create-case.dto';
import { QueryCasesDto } from '../dto/query-cases.dto';
import {
  ApplyFlagsDto,
  AssignCaseDto,
  CloseCaseDto,
  ContentActionDto,
  EscalateCaseDto,
  MergeCasesDto,
  ReopenCaseDto,
  ResolveCaseDto,
  ReviewCaseDto,
} from '../dto/case-actions.dto';

import { ModerationActor, actorCan } from '../moderation-actor';
import { canTransition } from '../moderation-case-state';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationFlagsService } from './moderation-flags.service';
import { ModerationContentService } from './moderation-content.service';
import { ContentPreviewService } from './content-preview.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

/** Severity ordering, used for sorting and for urgency decisions. */
const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 1,
  [IncidentSeverity.MEDIUM]: 2,
  [IncidentSeverity.HIGH]: 3,
  [IncidentSeverity.CRITICAL]: 4,
};

/**
 * The moderation queue and the case review workflow.
 *
 * Case mutations follow one shape throughout: check the transition is legal,
 * check the actor is permitted, persist the change and the status-history row
 * in a transaction, then record the action and notify — the last two outside
 * the transaction so a notification outage cannot roll back a decision.
 */
@Injectable()
export class ModerationCasesService {
  constructor(
    @InjectRepository(IncidentReport)
    private readonly caseRepo: Repository<IncidentReport>,
    @InjectRepository(IncidentStatus)
    private readonly statusRepo: Repository<IncidentStatus>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ModerationNote)
    private readonly noteRepo: Repository<ModerationNote>,
    @InjectRepository(ModerationFlagAssignment)
    private readonly flagAssignmentRepo: Repository<ModerationFlagAssignment>,
    private readonly dataSource: DataSource,
    private readonly audit: ModerationAuditService,
    private readonly flags: ModerationFlagsService,
    private readonly content: ModerationContentService,
    private readonly previews: ContentPreviewService,
    private readonly notifications: ModerationNotificationsService,
  ) {}

  // =======================================================================
  // Intake
  // =======================================================================

  /** Raise a case. Called by reporting users, not by moderators. */
  async create(
    dto: CreateCaseDto,
    reporterId: string,
  ): Promise<IncidentReport> {
    if (dto.reportedUserId && dto.reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report your own account.');
    }

    const preview = await this.previews.resolve(dto.targetType, dto.targetId);

    const severity = dto.severity ?? IncidentSeverity.MEDIUM;

    const created = await this.caseRepo.save(
      this.caseRepo.create({
        caseNumber: this.generateCaseNumber('HT'),
        targetType: dto.targetType,
        targetId: dto.targetId ?? null,
        contentId: dto.contentId ?? null,
        targetPreview: preview.body ?? preview.title,
        reportedUserId: dto.reportedUserId ?? preview.authorId ?? null,
        reportedByUserId: reporterId,
        isAnonymous: dto.isAnonymous ?? false,
        reportReason: dto.reportReason,
        description: dto.description,
        evidenceUrls: dto.evidenceUrls ?? null,
        severity,
        status: ModerationCaseStatus.OPEN,
      }),
    );

    await this.statusRepo.save(
      this.statusRepo.create({
        incidentReportId: created.id,
        fromStatus: null,
        status: ModerationCaseStatus.OPEN,
        decidedByUserId: reporterId,
        decisionReason: 'Report submitted',
      }),
    );

    await this.audit.record({
      actor: { userId: reporterId, role: UserRole.PLAYER },
      action: ModerationActionType.CREATED,
      incidentReportId: created.id,
      notes: dto.description,
      newValue: {
        status: ModerationCaseStatus.OPEN,
        severity,
        reason: dto.reportReason,
      },
      affectedObjectType: dto.targetType,
      affectedObjectId: dto.targetId ?? null,
    });

    const isUrgent =
      SEVERITY_RANK[severity] >= SEVERITY_RANK[IncidentSeverity.HIGH];

    await this.notifications.notifyModerationTeam(
      {
        type: isUrgent
          ? ModerationNotificationType.URGENT_REPORT
          : ModerationNotificationType.NEW_REPORT,
        title: isUrgent
          ? `Urgent report ${created.caseNumber}`
          : `New report ${created.caseNumber}`,
        body: `${dto.reportReason} — ${truncate(dto.description, 160)}`,
        link: `/dashboard/moderation/cases/${created.id}`,
        isUrgent,
        metadata: { caseId: created.id, severity },
      },
      { excludeUserId: reporterId },
    );

    return created;
  }

  // =======================================================================
  // Queue
  // =======================================================================

  async findAll(query: QueryCasesDto, actor: ModerationActor) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.assignedModerator', 'assignee')
      .leftJoinAndSelect('c.reportedUser', 'reportedUser')
      .leftJoinAndSelect('c.reportedByUser', 'reporter');

    if (query.search) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.caseNumber ILIKE :search', { search: `%${query.search}%` })
            .orWhere('c.description ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('c.targetPreview ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }

    if (query.status?.length) {
      qb.andWhere('c.status IN (:...status)', { status: query.status });
    }

    if (query.openOnly) {
      qb.andWhere('c.status NOT IN (:...terminal)', {
        terminal: [
          ModerationCaseStatus.RESOLVED,
          ModerationCaseStatus.DISMISSED,
          ModerationCaseStatus.CLOSED,
          ModerationCaseStatus.DUPLICATE,
        ],
      });
    }

    if (query.severity?.length) {
      qb.andWhere('c.severity IN (:...severity)', { severity: query.severity });
    }

    if (query.reason?.length) {
      qb.andWhere('c.reportReason IN (:...reason)', { reason: query.reason });
    }

    if (query.targetType?.length) {
      qb.andWhere('c.targetType IN (:...targetType)', {
        targetType: query.targetType,
      });
    }

    if (query.mine) {
      qb.andWhere('c.assignedModeratorId = :actorId', {
        actorId: actor.userId,
      });
    } else if (query.assignedModeratorId) {
      qb.andWhere('c.assignedModeratorId = :assignee', {
        assignee: query.assignedModeratorId,
      });
    }

    if (query.unassigned) {
      qb.andWhere('c.assignedModeratorId IS NULL');
    }

    if (query.reportedUserId) {
      qb.andWhere('c.reportedUserId = :reportedUserId', {
        reportedUserId: query.reportedUserId,
      });
    }

    if (query.reporterId) {
      qb.andWhere('c.reportedByUserId = :reporterId', {
        reporterId: query.reporterId,
      });
    }

    if (query.flagCode) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM moderation_flag_assignments fa
           JOIN moderation_flags f ON f.id = fa.flag_id
           WHERE fa.incident_report_id = c.id
             AND fa.removed_at IS NULL
             AND f.code = :flagCode
         )`,
        { flagCode: query.flagCode },
      );
    }

    if (query.from) {
      qb.andWhere('c.createdAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('c.createdAt <= :to', { to: new Date(query.to) });
    }

    // Severity is an enum column, so ordering by it alphabetically would put
    // CRITICAL after HIGH. Order by its rank instead.
    if (sortBy === 'severity') {
      qb.addSelect(
        `CASE c.severity
           WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3
           WHEN 'MEDIUM' THEN 2 ELSE 1 END`,
        'severity_rank',
      ).orderBy('severity_rank', sortOrder);
    } else {
      qb.orderBy(`c.${sortBy}`, sortOrder);
    }
    qb.addOrderBy('c.createdAt', 'DESC');

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const caseFlags = await this.flagsByCaseId(items.map((i) => i.id));

    return {
      items: items.map((c) => ({
        ...this.redactReporter(c, actor),
        flags: (caseFlags.get(c.id) ?? []).map((a) => ({
          id: a.id,
          code: a.flag?.code,
          label: a.flag?.label,
          color: a.flag?.color,
          icon: a.flag?.icon,
          severity: a.flag?.severity,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // =======================================================================
  // Detail
  // =======================================================================

  async findOne(id: string, actor: ModerationActor) {
    const found = await this.caseRepo.findOne({
      where: { id },
      relations: [
        'assignedModerator',
        'reportedUser',
        'reportedByUser',
        'content',
      ],
    });

    if (!found) throw new NotFoundException('Moderation case not found');

    const [timeline, statusHistory, flags, notes, preview, duplicates] =
      await Promise.all([
        this.audit.timelineFor(id),
        this.statusRepo.find({
          where: { incidentReportId: id },
          relations: ['decidedByUser'],
          order: { createdAt: 'ASC' },
        }),
        this.flags.flagsFor(found.targetType, found.targetId ?? id, true),
        this.noteRepo.find({
          where: { incidentReportId: id, deletedAt: IsNull() },
          relations: ['author'],
          order: { createdAt: 'DESC' },
        }),
        this.previews.resolve(
          found.targetType,
          found.targetId,
          found.targetPreview,
        ),
        this.caseRepo.find({
          where: { duplicateOfId: id },
          select: ['id', 'caseNumber', 'createdAt', 'reportReason'],
        }),
      ]);

    const contentState = found.targetId
      ? await this.content.stateFor(found.targetType, found.targetId)
      : null;

    return {
      ...this.redactReporter(found, actor),
      preview,
      contentVisibility: contentState?.visibility ?? 'VISIBLE',
      flags,
      notes,
      duplicates,
      timeline: this.buildTimeline(timeline, statusHistory),
    };
  }

  // =======================================================================
  // Workflow actions
  // =======================================================================

  async assign(id: string, dto: AssignCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);

    const targetId = dto.moderatorId ?? actor.userId;
    const isSelfClaim = targetId === actor.userId;

    if (!isSelfClaim && !actorCan(actor, ModerationPermission.ASSIGN_OTHERS)) {
      throw new ForbiddenException(
        'You may only claim cases for yourself. Assigning to another ' +
          'moderator requires the ASSIGN_OTHERS permission.',
      );
    }

    const assignee = await this.userRepo.findOne({ where: { id: targetId } });
    if (!assignee) throw new NotFoundException('Target moderator not found');
    if (assignee.role === UserRole.PLAYER) {
      throw new BadRequestException(
        'Cases can only be assigned to moderation staff.',
      );
    }

    if (found.assignedModeratorId === targetId) {
      throw new ConflictException('That moderator already owns this case.');
    }

    const previous = {
      status: found.status,
      assignedModeratorId: found.assignedModeratorId ?? null,
    };

    const nextStatus = this.nextStatusFor(
      found.status,
      ModerationCaseStatus.ASSIGNED,
    );

    const updated = await this.applyTransition(
      found,
      nextStatus,
      actor,
      dto.reason,
      {
        assignedModeratorId: targetId,
        assignedAt: new Date(),
      },
    );

    const wasReassignment = !!previous.assignedModeratorId;

    await this.audit.record({
      actor,
      action: isSelfClaim
        ? ModerationActionType.CLAIMED
        : wasReassignment
          ? ModerationActionType.REASSIGNED
          : ModerationActionType.ASSIGNED,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: { status: updated.status, assignedModeratorId: targetId },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    if (!isSelfClaim) {
      await this.notifications.notify({
        recipientId: targetId,
        type: ModerationNotificationType.CASE_ASSIGNED,
        title: `Case ${found.caseNumber} assigned to you`,
        body: dto.reason,
        link: `/dashboard/moderation/cases/${id}`,
        metadata: { caseId: id },
      });
    }

    return updated;
  }

  /** Open a case for review, or park it awaiting more information. */
  async review(id: string, dto: ReviewCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);
    const target = dto.status ?? ModerationCaseStatus.UNDER_REVIEW;

    if (
      target !== ModerationCaseStatus.UNDER_REVIEW &&
      target !== ModerationCaseStatus.AWAITING_INFO
    ) {
      throw new BadRequestException(
        'review accepts only UNDER_REVIEW or AWAITING_INFO.',
      );
    }

    const previous = { status: found.status, severity: found.severity };

    const patch: QueryDeepPartialEntity<IncidentReport> = {};
    if (dto.severity) patch.severity = dto.severity;
    // Taking a case into review implicitly claims it when it is unowned.
    if (!found.assignedModeratorId) {
      patch.assignedModeratorId = actor.userId;
      patch.assignedAt = new Date();
    }
    if (!found.firstReviewedAt) {
      patch.firstReviewedAt = new Date();
    }

    const updated = await this.applyTransition(
      found,
      target,
      actor,
      dto.reason,
      patch,
    );

    await this.audit.record({
      actor,
      action:
        target === ModerationCaseStatus.AWAITING_INFO
          ? ModerationActionType.REQUEST_MORE_INFO
          : ModerationActionType.REVIEW_STARTED,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: { status: updated.status, severity: updated.severity },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    return updated;
  }

  async resolve(id: string, dto: ResolveCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);

    if (
      dto.outcome !== ModerationCaseStatus.RESOLVED &&
      dto.outcome !== ModerationCaseStatus.DISMISSED
    ) {
      throw new BadRequestException(
        'outcome must be RESOLVED (upheld) or DISMISSED (rejected).',
      );
    }

    const now = new Date();
    const previous = { status: found.status };

    const updated = await this.applyTransition(
      found,
      dto.outcome,
      actor,
      dto.reason,
      {
        resolutionNotes: dto.notes ?? dto.reason,
        resolvedById: actor.userId,
        resolvedAt: now,
        resolutionSeconds: Math.max(
          0,
          Math.round((now.getTime() - found.createdAt.getTime()) / 1000),
        ),
      },
    );

    await this.audit.record({
      actor,
      action:
        dto.outcome === ModerationCaseStatus.RESOLVED
          ? ModerationActionType.APPROVED
          : ModerationActionType.DISMISSED,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: { status: dto.outcome, resolvedAt: now.toISOString() },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    return updated;
  }

  async reopen(id: string, dto: ReopenCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);
    const previous = { status: found.status };

    const updated = await this.applyTransition(
      found,
      ModerationCaseStatus.OPEN,
      actor,
      dto.reason,
      {
        reopenCount: found.reopenCount + 1,
        resolvedAt: null,
        resolvedById: null,
        resolutionSeconds: null,
        duplicateOfId: null,
      },
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.REOPENED,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: { status: updated.status, reopenCount: updated.reopenCount },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    return updated;
  }

  async close(id: string, dto: CloseCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);
    const previous = { status: found.status };

    const updated = await this.applyTransition(
      found,
      ModerationCaseStatus.CLOSED,
      actor,
      dto.reason,
      {},
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.CLOSED,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: { status: updated.status },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    return updated;
  }

  async escalate(id: string, dto: EscalateCaseDto, actor: ModerationActor) {
    const found = await this.requireCase(id);

    if (dto.escalateToId) {
      const target = await this.userRepo.findOne({
        where: { id: dto.escalateToId },
      });
      if (!target) throw new NotFoundException('Escalation target not found');
      if (
        target.role === UserRole.PLAYER ||
        target.role === UserRole.MODERATOR
      ) {
        throw new BadRequestException(
          'Cases can only be escalated to a senior moderator or administrator.',
        );
      }
    }

    const previous = { status: found.status };

    const updated = await this.applyTransition(
      found,
      ModerationCaseStatus.ESCALATED,
      actor,
      dto.reason,
      { escalatedToId: dto.escalateToId ?? null },
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.ESCALATE,
      incidentReportId: id,
      reason: dto.reason,
      notes: dto.notes,
      previousValue: previous,
      newValue: {
        status: updated.status,
        escalatedToId: dto.escalateToId ?? null,
      },
      affectedObjectType: 'moderation_case',
      affectedObjectId: id,
    });

    const notification = {
      type: ModerationNotificationType.CASE_ESCALATED,
      title: `Case ${found.caseNumber} escalated`,
      body: dto.reason,
      link: `/dashboard/moderation/cases/${id}`,
      isUrgent: true,
      metadata: { caseId: id },
    };

    if (dto.escalateToId) {
      await this.notifications.notify({
        ...notification,
        recipientId: dto.escalateToId,
      });
    } else {
      await this.notifications.notifyRoles(
        [UserRole.SENIOR_MODERATOR, UserRole.ORG_ADMIN, UserRole.SYSTEM_ADMIN],
        notification,
        { excludeUserId: actor.userId },
      );
    }

    return updated;
  }

  /** Fold other cases into this one. They become DUPLICATE and close. */
  async merge(id: string, dto: MergeCasesDto, actor: ModerationActor) {
    const primary = await this.requireCase(id);

    if (dto.duplicateIds.includes(id)) {
      throw new BadRequestException('A case cannot be merged into itself.');
    }

    const duplicates = await this.caseRepo.find({
      where: { id: In(dto.duplicateIds) },
    });

    if (duplicates.length !== dto.duplicateIds.length) {
      throw new NotFoundException('One or more cases to merge were not found.');
    }

    const alreadyMerged = duplicates.filter((d) => d.duplicateOfId);
    if (alreadyMerged.length > 0) {
      throw new ConflictException(
        `Already merged: ${alreadyMerged.map((d) => d.caseNumber).join(', ')}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      for (const duplicate of duplicates) {
        await manager.update(
          IncidentReport,
          { id: duplicate.id },
          {
            status: ModerationCaseStatus.DUPLICATE,
            duplicateOfId: id,
            resolvedAt: new Date(),
            resolvedById: actor.userId,
          },
        );

        await manager.save(
          manager.create(IncidentStatus, {
            incidentReportId: duplicate.id,
            fromStatus: duplicate.status,
            status: ModerationCaseStatus.DUPLICATE,
            decidedByUserId: actor.userId,
            decisionReason: dto.reason,
          }),
        );
      }
    });

    for (const duplicate of duplicates) {
      await this.audit.record({
        actor,
        action: ModerationActionType.MERGED_DUPLICATE,
        incidentReportId: duplicate.id,
        reason: dto.reason,
        notes: dto.notes,
        previousValue: { status: duplicate.status, duplicateOfId: null },
        newValue: {
          status: ModerationCaseStatus.DUPLICATE,
          duplicateOfId: id,
        },
        affectedObjectType: 'moderation_case',
        affectedObjectId: duplicate.id,
      });
    }

    return this.findOne(primary.id, actor);
  }

  // =======================================================================
  // Content actions taken from a case
  // =======================================================================

  async applyFlags(id: string, dto: ApplyFlagsDto, actor: ModerationActor) {
    const found = await this.requireCase(id);

    return this.flags.applyFlags(
      {
        targetType: found.targetType,
        targetId: found.targetId ?? found.id,
        incidentReportId: found.id,
      },
      dto.flagCodes,
      actor,
      dto.reason,
    );
  }

  async hideContent(id: string, dto: ContentActionDto, actor: ModerationActor) {
    const found = await this.requireTargetedCase(id);
    return this.content.hide(this.contentRef(found), actor, dto.reason);
  }

  async deleteContent(
    id: string,
    dto: ContentActionDto,
    actor: ModerationActor,
  ) {
    const found = await this.requireTargetedCase(id);
    const result = await this.content.remove(
      this.contentRef(found),
      actor,
      dto.reason,
    );

    if (found.reportedUserId) {
      await this.notifications.notify({
        recipientId: found.reportedUserId,
        type: ModerationNotificationType.CONTENT_REMOVED,
        title: 'Your content was removed',
        body: dto.reason,
        link: '/dashboard/profile',
        email: true,
        metadata: { caseId: found.id },
      });
    }

    return result;
  }

  async restoreContent(
    id: string,
    dto: ContentActionDto,
    actor: ModerationActor,
  ) {
    const found = await this.requireTargetedCase(id);
    return this.content.restore(this.contentRef(found), actor, dto.reason);
  }

  // =======================================================================
  // Dashboard
  // =======================================================================

  /** The overview cards on the moderation dashboard. */
  async dashboardOverview() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const openStatuses = [
      ModerationCaseStatus.OPEN,
      ModerationCaseStatus.ASSIGNED,
      ModerationCaseStatus.UNDER_REVIEW,
      ModerationCaseStatus.AWAITING_INFO,
      ModerationCaseStatus.ESCALATED,
    ];

    const [
      pendingReports,
      awaitingReview,
      escalated,
      flaggedContent,
      suspendedUsers,
      activeModerators,
      resolvedToday,
      reportsThisWeek,
      avgResolution,
      openAppeals,
    ] = await Promise.all([
      this.caseRepo.count({ where: { status: In(openStatuses) } }),
      this.caseRepo.count({ where: { status: ModerationCaseStatus.OPEN } }),
      this.caseRepo.count({
        where: { status: ModerationCaseStatus.ESCALATED },
      }),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT (target_type, target_id))::int AS count
           FROM moderation_flag_assignments WHERE removed_at IS NULL`,
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM user_sanctions WHERE status = 'ACTIVE'`,
      ),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT moderator_user_id)::int AS count
           FROM moderation_actions WHERE created_at >= $1`,
        [startOfWeek],
      ),
      this.caseRepo
        .createQueryBuilder('c')
        .where('c.resolvedAt >= :start', { start: startOfToday })
        .getCount(),
      this.caseRepo
        .createQueryBuilder('c')
        .where('c.createdAt >= :start', { start: startOfWeek })
        .getCount(),
      this.caseRepo
        .createQueryBuilder('c')
        .select('AVG(c.resolutionSeconds)', 'avg')
        .where('c.resolutionSeconds IS NOT NULL')
        .andWhere('c.resolvedAt >= :start', { start: startOfWeek })
        .getRawOne<{ avg: string | null }>(),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS count FROM moderation_appeals
           WHERE status IN ('SUBMITTED', 'UNDER_REVIEW')`,
      ),
    ]);

    return {
      pendingReports,
      awaitingReview,
      escalated,
      flaggedContent: firstCount(flaggedContent),
      suspendedUsers: firstCount(suspendedUsers),
      activeModerators: firstCount(activeModerators),
      resolvedToday,
      reportsThisWeek,
      openAppeals: firstCount(openAppeals),
      averageResolutionSeconds: avgResolution?.avg
        ? Math.round(Number(avgResolution.avg))
        : null,
      generatedAt: now.toISOString(),
    };
  }

  // =======================================================================
  // Internals
  // =======================================================================

  private async requireCase(id: string): Promise<IncidentReport> {
    const found = await this.caseRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Moderation case not found');
    return found;
  }

  private async requireTargetedCase(id: string): Promise<IncidentReport> {
    const found = await this.requireCase(id);
    if (!found.targetId) {
      throw new BadRequestException(
        'This case has no linked content to action.',
      );
    }
    return found;
  }

  private contentRef(found: IncidentReport) {
    return {
      targetType: found.targetType,
      targetId: found.targetId as string,
      incidentReportId: found.id,
      snapshot: found.targetPreview ?? null,
    };
  }

  /**
   * Persist a status change plus its history row atomically, rejecting moves
   * the state machine does not allow.
   */
  private async applyTransition(
    found: IncidentReport,
    to: ModerationCaseStatus,
    actor: ModerationActor,
    reason: string,
    patch: QueryDeepPartialEntity<IncidentReport>,
  ): Promise<IncidentReport> {
    if (found.status !== to && !canTransition(found.status, to)) {
      throw new ConflictException(
        `A case in ${found.status} cannot move to ${to}.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const from = found.status;

      await manager.update(
        IncidentReport,
        { id: found.id },
        { ...patch, status: to },
      );

      if (from !== to) {
        await manager.save(
          manager.create(IncidentStatus, {
            incidentReportId: found.id,
            fromStatus: from,
            status: to,
            decidedByUserId: actor.userId,
            decisionReason: reason,
          }),
        );
      }

      return manager.findOneOrFail(IncidentReport, {
        where: { id: found.id },
        relations: ['assignedModerator', 'reportedUser'],
      });
    });
  }

  /**
   * Assignment normally moves a case to ASSIGNED, but re-assigning a case
   * that is already being worked should not drag it backwards.
   */
  private nextStatusFor(
    current: ModerationCaseStatus,
    intended: ModerationCaseStatus,
  ): ModerationCaseStatus {
    const keepCurrent = [
      ModerationCaseStatus.UNDER_REVIEW,
      ModerationCaseStatus.AWAITING_INFO,
      ModerationCaseStatus.ESCALATED,
    ];
    return keepCurrent.includes(current) ? current : intended;
  }

  /**
   * Anonymous reporters are hidden from moderators. Administrators can still
   * see the identity, because abuse of the reporting system has to be
   * investigable.
   */
  private redactReporter<T extends IncidentReport>(
    found: T,
    actor: ModerationActor,
  ): T {
    if (!found.isAnonymous) return found;

    const privileged =
      actor.role === UserRole.ORG_ADMIN || actor.role === UserRole.SYSTEM_ADMIN;
    if (privileged) return found;

    return {
      ...found,
      reportedByUserId: null as unknown as string,
      reportedByUser: null as unknown as User,
    };
  }

  /** Live flags grouped by the case they were applied from. */
  private async flagsByCaseId(
    caseIds: string[],
  ): Promise<Map<string, ModerationFlagAssignment[]>> {
    const grouped = new Map<string, ModerationFlagAssignment[]>();
    if (caseIds.length === 0) return grouped;

    const rows = await this.flagAssignmentRepo.find({
      where: { incidentReportId: In(caseIds), removedAt: IsNull() },
      relations: ['flag'],
    });

    for (const row of rows) {
      if (!row.incidentReportId) continue;
      const bucket = grouped.get(row.incidentReportId) ?? [];
      bucket.push(row);
      grouped.set(row.incidentReportId, bucket);
    }

    return grouped;
  }

  /** e.g. `HT-4F2A19`. Short enough to read aloud in a handover. */
  private generateCaseNumber(prefix: string): string {
    return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /** Interleave action rows and status rows into one chronological trail. */
  private buildTimeline(
    actions: Awaited<ReturnType<ModerationAuditService['timelineFor']>>,
    statuses: IncidentStatus[],
  ) {
    const events = [
      ...actions.map((a) => ({
        kind: 'ACTION' as const,
        id: a.id,
        at: a.createdAt,
        action: a.action,
        actorId: a.moderatorUserId,
        actorName: a.moderatorUser?.fullName ?? null,
        reason: a.reason ?? null,
        notes: a.notes ?? null,
        previousValue: a.previousValue ?? null,
        newValue: a.newValue ?? null,
      })),
      ...statuses.map((s) => ({
        kind: 'STATUS' as const,
        id: s.id,
        at: s.createdAt,
        action: `${s.fromStatus ?? 'NEW'} → ${s.status}`,
        actorId: s.decidedByUserId,
        actorName: s.decidedByUser?.fullName ?? null,
        reason: s.decisionReason ?? null,
        notes: null,
        previousValue: s.fromStatus ? { status: s.fromStatus } : null,
        newValue: { status: s.status },
      })),
    ];

    return events.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function firstCount(rows: Array<{ count: number }>): number {
  return rows?.[0]?.count ?? 0;
}
