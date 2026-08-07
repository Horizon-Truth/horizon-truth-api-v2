import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ModerationAppealsService } from './moderation-appeals.service';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

import { ModerationAppeal } from '../entities/moderation-appeal.entity';
import { UserSanction } from '../entities/user-sanction.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { User } from '../../users/entities/user.entity';

import {
  AppealStatus,
  AppealSubjectType,
} from '../../shared/enums/moderation-appeal.enum';
import {
  UserSanctionStatus,
  UserSanctionType,
} from '../../shared/enums/user-sanction.enum';
import { UserRole } from '../../shared/enums/user-role.enum';
import { ModerationActor } from '../moderation-actor';

const reviewer: ModerationActor = {
  userId: 'senior-1',
  role: UserRole.SENIOR_MODERATOR,
};
const decider: ModerationActor = {
  userId: 'mod-original',
  role: UserRole.SENIOR_MODERATOR,
};
const sysAdmin: ModerationActor = {
  userId: 'root-1',
  role: UserRole.SYSTEM_ADMIN,
};

function makeAppeal(overrides: Partial<ModerationAppeal> = {}) {
  return {
    id: 'appeal-1',
    appealNumber: 'AP-9C31D0',
    appellantId: 'player-1',
    subjectType: AppealSubjectType.SANCTION,
    sanctionId: 'sanction-1',
    incidentReportId: null,
    reason: 'The post was satire and was labelled as such.',
    status: AppealStatus.SUBMITTED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ModerationAppeal;
}

function makeSanction(overrides: Partial<UserSanction> = {}) {
  return {
    id: 'sanction-1',
    userId: 'player-1',
    type: UserSanctionType.TEMPORARY_SUSPENSION,
    status: UserSanctionStatus.ACTIVE,
    reason: 'original reason',
    issuedById: 'mod-original',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserSanction;
}

describe('ModerationAppealsService', () => {
  let service: ModerationAppealsService;
  let appealRepo: any;
  let sanctionRepo: any;
  let caseRepo: any;
  let transactionManager: any;

  beforeEach(async () => {
    transactionManager = {
      create: jest.fn((_e, data) => data),
      save: jest.fn(async (e) => e),
      update: jest.fn(async () => ({ affected: 1 })),
      count: jest.fn(async () => 0),
      findOne: jest.fn(async () => makeSanction()),
    };

    appealRepo = {
      findOne: jest.fn(async () => makeAppeal()),
      find: jest.fn(async () => []),
      create: jest.fn((d) => ({ id: 'appeal-new', ...d })),
      save: jest.fn(async (e) => e),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(),
    };

    sanctionRepo = { findOne: jest.fn(async () => makeSanction()) };
    caseRepo = { findOne: jest.fn(async () => null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationAppealsService,
        { provide: getRepositoryToken(ModerationAppeal), useValue: appealRepo },
        { provide: getRepositoryToken(UserSanction), useValue: sanctionRepo },
        { provide: getRepositoryToken(IncidentReport), useValue: caseRepo },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: (m: unknown) => unknown) =>
              cb(transactionManager),
            ),
          },
        },
        {
          provide: ModerationAuditService,
          useValue: { record: jest.fn(async () => ({})) },
        },
        {
          provide: ModerationNotificationsService,
          useValue: {
            notify: jest.fn(async () => undefined),
            notifyRoles: jest.fn(async () => undefined),
          },
        },
      ],
    }).compile();

    service = module.get(ModerationAppealsService);
  });

  // =======================================================================

  describe('submission', () => {
    it('refuses an appeal against someone else’s sanction', async () => {
      sanctionRepo.findOne.mockResolvedValue(
        makeSanction({ userId: 'someone-else' }),
      );
      appealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'sanction-1',
            reason: 'I disagree with this decision entirely.',
          },
          'player-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses an appeal lodged after the 30-day window', async () => {
      sanctionRepo.findOne.mockResolvedValue(
        makeSanction({ createdAt: new Date(Date.now() - 45 * 86_400_000) }),
      );
      appealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'sanction-1',
            reason: 'I disagree with this decision entirely.',
          },
          'player-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a second open appeal against the same decision', async () => {
      appealRepo.findOne.mockResolvedValue(
        makeAppeal({ status: AppealStatus.UNDER_REVIEW }),
      );

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'sanction-1',
            reason: 'I disagree with this decision entirely.',
          },
          'player-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to re-appeal a decision already rejected on appeal', async () => {
      appealRepo.findOne.mockResolvedValue(
        makeAppeal({ status: AppealStatus.REJECTED }),
      );

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'sanction-1',
            reason: 'I disagree with this decision entirely.',
          },
          'player-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s when the sanction does not exist', async () => {
      sanctionRepo.findOne.mockResolvedValue(null);
      appealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'missing',
            reason: 'I disagree with this decision entirely.',
          },
          'player-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts a timely, first appeal against your own sanction', async () => {
      appealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submit(
          {
            subjectType: AppealSubjectType.SANCTION,
            sanctionId: 'sanction-1',
            reason: 'The post was satire and was labelled as such.',
          },
          'player-1',
        ),
      ).resolves.toMatchObject({ status: AppealStatus.SUBMITTED });
    });
  });

  // =======================================================================

  describe('impartiality', () => {
    it('refuses to let the original decision-maker review the appeal', async () => {
      await expect(
        service.startReview('appeal-1', decider),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to let the appellant review their own appeal', async () => {
      await expect(
        service.startReview('appeal-1', {
          userId: 'player-1',
          role: UserRole.SENIOR_MODERATOR,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an uninvolved senior moderator take the review', async () => {
      await expect(
        service.startReview('appeal-1', reviewer),
      ).resolves.toBeDefined();

      expect(appealRepo.update).toHaveBeenCalledWith(
        { id: 'appeal-1' },
        expect.objectContaining({
          status: AppealStatus.UNDER_REVIEW,
          reviewerId: 'senior-1',
        }),
      );
    });

    it('exempts a system administrator as the last-resort reviewer', async () => {
      await expect(
        service.startReview('appeal-1', sysAdmin),
      ).resolves.toBeDefined();
    });

    it('still blocks a system administrator from reviewing their own appeal', async () => {
      appealRepo.findOne.mockResolvedValue(
        makeAppeal({ appellantId: 'root-1' }),
      );

      await expect(
        service.startReview('appeal-1', sysAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // =======================================================================

  describe('decide', () => {
    it('refuses to re-decide a closed appeal', async () => {
      appealRepo.findOne.mockResolvedValue(
        makeAppeal({ status: AppealStatus.ACCEPTED }),
      );

      await expect(
        service.decide(
          'appeal-1',
          {
            decision: AppealStatus.REJECTED,
            moderatorResponse: 'Reconsidered.',
          },
          reviewer,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('overturns the sanction when the appeal is upheld', async () => {
      await service.decide(
        'appeal-1',
        {
          decision: AppealStatus.ACCEPTED,
          moderatorResponse:
            'On review the content was clearly labelled satire.',
        },
        reviewer,
      );

      expect(transactionManager.update).toHaveBeenCalledWith(
        UserSanction,
        { id: 'sanction-1' },
        expect.objectContaining({ status: UserSanctionStatus.OVERTURNED }),
      );
    });

    it('leaves the sanction in place when the appeal is rejected', async () => {
      await service.decide(
        'appeal-1',
        {
          decision: AppealStatus.REJECTED,
          moderatorResponse: 'The original decision stands.',
        },
        reviewer,
      );

      const sanctionUpdates = transactionManager.update.mock.calls.filter(
        ([entity]: [unknown]) => entity === UserSanction,
      );
      expect(sanctionUpdates).toHaveLength(0);
    });

    it('reopens the originating case when a case appeal is upheld', async () => {
      appealRepo.findOne.mockResolvedValue(
        makeAppeal({
          subjectType: AppealSubjectType.CASE,
          sanctionId: null,
          incidentReportId: 'case-1',
        }),
      );
      caseRepo.findOne.mockResolvedValue({ id: 'case-1', resolvedById: null });

      await service.decide(
        'appeal-1',
        {
          decision: AppealStatus.ACCEPTED,
          moderatorResponse: 'The original assessment was mistaken.',
        },
        reviewer,
      );

      expect(transactionManager.update).toHaveBeenCalledWith(
        IncidentReport,
        { id: 'case-1' },
        expect.objectContaining({ status: 'OPEN', resolvedAt: null }),
      );
    });
  });
});
