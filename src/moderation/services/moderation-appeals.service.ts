import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { ModerationAppeal } from '../entities/moderation-appeal.entity';
import { UserSanction } from '../entities/user-sanction.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationNotificationType } from '../entities/moderation-notification.entity';

import {
  APPEAL_WINDOW_DAYS,
  AppealStatus,
  AppealSubjectType,
} from '../../shared/enums/moderation-appeal.enum';
import { UserSanctionStatus } from '../../shared/enums/user-sanction.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { ModerationCaseStatus } from '../../shared/enums/moderation-case-status.enum';
import { ModerationActionType } from '../../shared/enums/moderation-action-type.enum';
import { UserRole } from '../../shared/enums/user-role.enum';

import {
  CreateAppealDto,
  DecideAppealDto,
  QueryAppealsDto,
} from '../dto/appeal.dto';
import { ModerationActor } from '../moderation-actor';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

/**
 * The appeals workflow: submitted → under review → accepted/rejected → closed.
 *
 * The central rule is that nobody reviews their own decision. Accepting an
 * appeal against a sanction also reverses it, so an upheld appeal is a real
 * remedy rather than a note on a file.
 */
@Injectable()
export class ModerationAppealsService {
  constructor(
    @InjectRepository(ModerationAppeal)
    private readonly appealRepo: Repository<ModerationAppeal>,
    @InjectRepository(UserSanction)
    private readonly sanctionRepo: Repository<UserSanction>,
    @InjectRepository(IncidentReport)
    private readonly caseRepo: Repository<IncidentReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly audit: ModerationAuditService,
    private readonly notifications: ModerationNotificationsService,
  ) {}

  // =======================================================================
  // Submission (by the affected user)
  // =======================================================================

  async submit(
    dto: CreateAppealDto,
    appellantId: string,
  ): Promise<ModerationAppeal> {
    const subject = await this.resolveSubject(dto, appellantId);

    const duplicate = await this.appealRepo.findOne({
      where: {
        appellantId,
        ...(dto.sanctionId ? { sanctionId: dto.sanctionId } : {}),
        ...(dto.incidentReportId
          ? { incidentReportId: dto.incidentReportId }
          : {}),
      },
      order: { createdAt: 'DESC' },
    });

    if (
      duplicate &&
      [AppealStatus.SUBMITTED, AppealStatus.UNDER_REVIEW].includes(
        duplicate.status,
      )
    ) {
      throw new ConflictException(
        'You already have an open appeal for this decision.',
      );
    }

    if (duplicate && duplicate.status === AppealStatus.REJECTED) {
      throw new ConflictException(
        'This decision has already been appealed and the appeal was rejected.',
      );
    }

    const appeal = await this.appealRepo.save(
      this.appealRepo.create({
        appealNumber: `AP-${randomBytes(3).toString('hex').toUpperCase()}`,
        appellantId,
        subjectType: dto.subjectType,
        incidentReportId: dto.incidentReportId ?? null,
        sanctionId: dto.sanctionId ?? null,
        reason: dto.reason,
        supportingEvidence: dto.supportingEvidence ?? null,
        attachments: dto.attachments ?? null,
        status: AppealStatus.SUBMITTED,
      }),
    );

    await this.audit.record({
      actor: { userId: appellantId, role: UserRole.PLAYER },
      action: ModerationActionType.APPEAL_SUBMITTED,
      incidentReportId: dto.incidentReportId ?? null,
      notes: dto.reason,
      affectedObjectType: 'moderation_appeal',
      affectedObjectId: appeal.id,
      newValue: { status: AppealStatus.SUBMITTED, subject: subject.label },
    });

    await this.notifications.notifyRoles(
      [UserRole.SENIOR_MODERATOR, UserRole.ORG_ADMIN, UserRole.SYSTEM_ADMIN],
      {
        type: ModerationNotificationType.APPEAL_SUBMITTED,
        title: `Appeal ${appeal.appealNumber} submitted`,
        body: dto.reason.slice(0, 200),
        link: `/dashboard/moderation/appeals/${appeal.id}`,
        metadata: { appealId: appeal.id },
      },
    );

    return appeal;
  }

  /** A user's own appeals. */
  async listMine(appellantId: string) {
    return this.appealRepo.find({
      where: { appellantId },
      relations: ['sanction', 'incidentReport'],
      order: { createdAt: 'DESC' },
    });
  }

  // =======================================================================
  // Review (by moderation staff)
  // =======================================================================

  async findAll(query: QueryAppealsDto) {
    const { page = 1, limit = 20 } = query;

    const qb = this.appealRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.appellant', 'appellant')
      .leftJoinAndSelect('a.reviewer', 'reviewer')
      .leftJoinAndSelect('a.sanction', 'sanction')
      .orderBy('a.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }

    if (query.appellantId) {
      qb.andWhere('a.appellantId = :appellantId', {
        appellantId: query.appellantId,
      });
    }

    if (query.search) {
      qb.andWhere('(a.appealNumber ILIKE :search OR a.reason ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<ModerationAppeal> {
    const appeal = await this.appealRepo.findOne({
      where: { id },
      relations: ['appellant', 'reviewer', 'sanction', 'incidentReport'],
    });
    if (!appeal) throw new NotFoundException('Appeal not found');
    return appeal;
  }

  /** Claim an appeal for review. */
  async startReview(id: string, actor: ModerationActor) {
    const appeal = await this.findOne(id);

    if (appeal.status !== AppealStatus.SUBMITTED) {
      throw new ConflictException(
        `An appeal in ${appeal.status} cannot be taken into review.`,
      );
    }

    await this.assertImpartial(appeal, actor);

    await this.appealRepo.update(
      { id },
      { status: AppealStatus.UNDER_REVIEW, reviewerId: actor.userId },
    );

    await this.audit.record({
      actor,
      action: ModerationActionType.APPEAL_REVIEW_STARTED,
      incidentReportId: appeal.incidentReportId ?? null,
      affectedObjectType: 'moderation_appeal',
      affectedObjectId: id,
      previousValue: { status: appeal.status },
      newValue: { status: AppealStatus.UNDER_REVIEW, reviewerId: actor.userId },
    });

    return this.findOne(id);
  }

  /**
   * Rule on an appeal. Accepting reverses the underlying sanction and reopens
   * the originating case so the record reflects the corrected outcome.
   */
  async decide(id: string, dto: DecideAppealDto, actor: ModerationActor) {
    const appeal = await this.findOne(id);

    if (
      appeal.status !== AppealStatus.SUBMITTED &&
      appeal.status !== AppealStatus.UNDER_REVIEW
    ) {
      throw new ConflictException(
        `Appeal ${appeal.appealNumber} has already been decided.`,
      );
    }

    if (
      dto.decision !== AppealStatus.ACCEPTED &&
      dto.decision !== AppealStatus.REJECTED
    ) {
      throw new BadRequestException('decision must be ACCEPTED or REJECTED.');
    }

    await this.assertImpartial(appeal, actor);

    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        ModerationAppeal,
        { id },
        {
          status: dto.decision,
          reviewerId: actor.userId,
          moderatorResponse: dto.moderatorResponse,
          reviewedAt: now,
          closedAt: now,
        },
      );

      if (dto.decision !== AppealStatus.ACCEPTED) return;

      if (appeal.sanctionId) {
        await manager.update(
          UserSanction,
          { id: appeal.sanctionId },
          {
            status: UserSanctionStatus.OVERTURNED,
            liftedAt: now,
            liftedById: actor.userId,
            liftReason: `Appeal ${appeal.appealNumber} upheld: ${dto.moderatorResponse}`,
          },
        );

        const stillSuspended = await manager.count(UserSanction, {
          where: {
            userId: appeal.appellantId,
            status: UserSanctionStatus.ACTIVE,
          },
        });

        if (stillSuspended === 0) {
          const sanction = await manager.findOne(UserSanction, {
            where: { id: appeal.sanctionId },
          });

          await manager.update(
            User,
            { id: appeal.appellantId },
            {
              status: (sanction?.previousUserStatus ??
                UserStatus.ACTIVE) as UserStatus,
            },
          );
        }
      }

      if (appeal.incidentReportId) {
        await manager.update(
          IncidentReport,
          { id: appeal.incidentReportId },
          {
            status: ModerationCaseStatus.OPEN,
            resolvedAt: null,
            resolvedById: null,
            resolutionSeconds: null,
            resolutionNotes: `Reopened by upheld appeal ${appeal.appealNumber}`,
          },
        );
      }
    });

    await this.audit.record({
      actor,
      action:
        dto.decision === AppealStatus.ACCEPTED
          ? ModerationActionType.APPEAL_ACCEPTED
          : ModerationActionType.APPEAL_REJECTED,
      incidentReportId: appeal.incidentReportId ?? null,
      reason: dto.moderatorResponse,
      affectedObjectType: 'moderation_appeal',
      affectedObjectId: id,
      previousValue: { status: appeal.status },
      newValue: { status: dto.decision },
    });

    await this.notifications.notify({
      recipientId: appeal.appellantId,
      type: ModerationNotificationType.APPEAL_RESULT,
      title:
        dto.decision === AppealStatus.ACCEPTED
          ? `Your appeal ${appeal.appealNumber} was upheld`
          : `Your appeal ${appeal.appealNumber} was not upheld`,
      body: dto.moderatorResponse,
      link: '/dashboard/profile',
      email: true,
      metadata: { appealId: id, decision: dto.decision },
    });

    return this.findOne(id);
  }

  // =======================================================================
  // Internals
  // =======================================================================

  /**
   * Confirm the appellant may appeal this subject: it must exist, belong to
   * them, and still be within the appeal window.
   */
  private async resolveSubject(
    dto: CreateAppealDto,
    appellantId: string,
  ): Promise<{ label: string; decidedById: string | null }> {
    if (dto.subjectType === AppealSubjectType.SANCTION) {
      if (!dto.sanctionId) {
        throw new BadRequestException(
          'sanctionId is required when appealing a sanction.',
        );
      }

      const sanction = await this.sanctionRepo.findOne({
        where: { id: dto.sanctionId },
      });
      if (!sanction) throw new NotFoundException('Sanction not found');
      if (sanction.userId !== appellantId) {
        throw new ForbiddenException(
          'You can only appeal a sanction against your own account.',
        );
      }
      if (sanction.status === UserSanctionStatus.OVERTURNED) {
        throw new ConflictException(
          'This sanction has already been overturned.',
        );
      }

      this.assertWithinWindow(sanction.createdAt);

      return {
        label: `${sanction.type} sanction`,
        decidedById: sanction.issuedById,
      };
    }

    if (!dto.incidentReportId) {
      throw new BadRequestException(
        'incidentReportId is required when appealing a case decision.',
      );
    }

    const found = await this.caseRepo.findOne({
      where: { id: dto.incidentReportId },
    });
    if (!found) throw new NotFoundException('Moderation case not found');

    if (found.reportedUserId !== appellantId) {
      throw new ForbiddenException(
        'You can only appeal a case decision that concerns your own content.',
      );
    }

    this.assertWithinWindow(found.resolvedAt ?? found.createdAt);

    return {
      label: `case ${found.caseNumber}`,
      decidedById: found.resolvedById ?? null,
    };
  }

  private assertWithinWindow(decidedAt: Date): void {
    const ageDays = (Date.now() - new Date(decidedAt).getTime()) / 86_400_000;

    if (ageDays > APPEAL_WINDOW_DAYS) {
      throw new ConflictException(
        `Appeals must be lodged within ${APPEAL_WINDOW_DAYS} days of the decision.`,
      );
    }
  }

  /**
   * Nobody rules on their own decision, and nobody rules on their own appeal.
   * System administrators are exempt only from the first rule, as a last
   * resort when no other reviewer is available.
   */
  private async assertImpartial(
    appeal: ModerationAppeal,
    actor: ModerationActor,
  ): Promise<void> {
    if (appeal.appellantId === actor.userId) {
      throw new ForbiddenException('You cannot review your own appeal.');
    }

    if (actor.role === UserRole.SYSTEM_ADMIN) return;

    const originalDeciderId = appeal.sanctionId
      ? (
          await this.sanctionRepo.findOne({
            where: { id: appeal.sanctionId },
            select: ['id', 'issuedById'],
          })
        )?.issuedById
      : appeal.incidentReportId
        ? (
            await this.caseRepo.findOne({
              where: { id: appeal.incidentReportId },
              select: ['id', 'resolvedById'],
            })
          )?.resolvedById
        : null;

    if (originalDeciderId && originalDeciderId === actor.userId) {
      throw new ForbiddenException(
        'You took the original decision, so this appeal must be reviewed by ' +
          'another moderator.',
      );
    }
  }
}
