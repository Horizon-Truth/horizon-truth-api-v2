import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { ModerationAuditService } from './moderation-audit.service';
import { ModerationAction } from '../../incidents/entities/moderation-action.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  ModerationActionType,
  REASON_REQUIRED_ACTIONS,
} from '../../shared/enums/moderation-action-type.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { ModerationActor } from '../moderation-actor';

const actor: ModerationActor = {
  userId: 'mod-1',
  role: UserRole.SENIOR_MODERATOR,
  ipAddress: '203.0.113.9',
  userAgent: 'Mozilla/5.0 (Macintosh)',
};

describe('ModerationAuditService', () => {
  let service: ModerationAuditService;
  let actionRepo: jest.Mocked<
    Pick<Repository<ModerationAction>, 'save' | 'find'>
  >;
  let auditLogs: jest.Mocked<Pick<AuditLogsService, 'createLog'>>;

  beforeEach(async () => {
    actionRepo = {
      save: jest.fn(async (entity) => ({ ...entity, id: 'action-1' })),
      find: jest.fn(async () => []),
    } as never;

    auditLogs = { createLog: jest.fn(async () => ({}) as never) } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationAuditService,
        { provide: getRepositoryToken(ModerationAction), useValue: actionRepo },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get(ModerationAuditService);
  });

  describe('reason enforcement', () => {
    it.each(REASON_REQUIRED_ACTIONS)(
      'refuses to record %s without a reason',
      async (action) => {
        await expect(
          service.record({ actor, action, incidentReportId: 'case-1' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(actionRepo.save).not.toHaveBeenCalled();
      },
    );

    it('treats a whitespace-only reason as missing', async () => {
      await expect(
        service.record({
          actor,
          action: ModerationActionType.USER_SUSPENDED,
          reason: '   ',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows lifecycle actions without a reason', async () => {
      await expect(
        service.record({
          actor,
          action: ModerationActionType.REVIEW_STARTED,
          incidentReportId: 'case-1',
        }),
      ).resolves.toMatchObject({ id: 'action-1' });
    });
  });

  describe('trail contents', () => {
    it('captures who, from where, what changed and why', async () => {
      await service.record({
        actor,
        action: ModerationActionType.USER_WARNED,
        incidentReportId: 'case-1',
        reason: 'Repeated coordinated posting after a prior warning.',
        previousValue: { status: 'ACTIVE' },
        newValue: { status: 'WARNED' },
        affectedObjectType: 'user',
        affectedObjectId: 'user-9',
      });

      expect(actionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          moderatorUserId: 'mod-1',
          ipAddress: '203.0.113.9',
          userAgent: 'Mozilla/5.0 (Macintosh)',
          reason: 'Repeated coordinated posting after a prior warning.',
          previousValue: { status: 'ACTIVE' },
          newValue: { status: 'WARNED' },
          affectedObjectType: 'user',
          affectedObjectId: 'user-9',
        }),
      );
    });

    it('mirrors the action into the platform audit log', async () => {
      await service.record({
        actor,
        action: ModerationActionType.CONTENT_DELETED,
        incidentReportId: 'case-1',
        reason: 'Confirmed doctored image presented as evidence.',
        affectedObjectType: 'COMMENT',
        affectedObjectId: 'comment-4',
      });

      expect(auditLogs.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'mod-1',
          action: 'MODERATION CONTENT_DELETED',
          entityType: 'COMMENT',
          entityId: 'comment-4',
          reason: 'Confirmed doctored image presented as evidence.',
        }),
      );
    });

    it('falls back to the case id when no object was named', async () => {
      await service.record({
        actor,
        action: ModerationActionType.REVIEW_STARTED,
        incidentReportId: 'case-77',
      });

      expect(auditLogs.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'moderation_case',
          entityId: 'case-77',
        }),
      );
    });
  });

  describe('resilience', () => {
    it('keeps the moderation action when the audit mirror fails', async () => {
      auditLogs.createLog.mockRejectedValueOnce(new Error('audit db down'));

      // The decision has already been committed; losing the mirror row must
      // not surface as a failed moderation action.
      await expect(
        service.record({
          actor,
          action: ModerationActionType.REVIEW_STARTED,
          incidentReportId: 'case-1',
        }),
      ).resolves.toMatchObject({ id: 'action-1' });
    });
  });
});
