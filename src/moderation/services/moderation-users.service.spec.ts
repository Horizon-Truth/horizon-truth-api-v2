import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ModerationUsersService } from './moderation-users.service';
import { ModerationAuditService } from './moderation-audit.service';
import { ModerationNotificationsService } from './moderation-notifications.service';

import { User } from '../../users/entities/user.entity';
import { UserSanction } from '../entities/user-sanction.entity';
import { ModerationNote } from '../entities/moderation-note.entity';
import { ModerationAppeal } from '../entities/moderation-appeal.entity';
import { IncidentReport } from '../../incidents/entities/incident-report.entity';

import { UserRole } from '../../shared/enums/user-role.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import {
  UserSanctionStatus,
  UserSanctionType,
} from '../../shared/enums/user-sanction.enum';
import { ModerationActor } from '../moderation-actor';

const moderator: ModerationActor = {
  userId: 'mod-1',
  role: UserRole.MODERATOR,
};
const senior: ModerationActor = {
  userId: 'senior-1',
  role: UserRole.SENIOR_MODERATOR,
};
const orgAdmin: ModerationActor = {
  userId: 'admin-1',
  role: UserRole.ORG_ADMIN,
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'player-1',
    fullName: 'Test Player',
    role: UserRole.PLAYER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeSanction(overrides: Partial<UserSanction> = {}): UserSanction {
  return {
    id: 'sanction-1',
    userId: 'player-1',
    type: UserSanctionType.WARNING,
    status: UserSanctionStatus.ACTIVE,
    reason: 'test',
    issuedById: 'mod-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserSanction;
}

describe('ModerationUsersService', () => {
  let service: ModerationUsersService;
  let userRepo: any;
  let sanctionRepo: any;
  let appealRepo: any;
  let dataSource: any;
  let audit: jest.Mocked<Pick<ModerationAuditService, 'record'>>;
  let notifications: jest.Mocked<
    Pick<ModerationNotificationsService, 'notify'>
  >;
  let transactionManager: any;

  beforeEach(async () => {
    transactionManager = {
      create: jest.fn((_entity, data) => ({ id: 'created-1', ...data })),
      save: jest.fn(async (entity) => entity),
      update: jest.fn(async () => ({ affected: 1 })),
      count: jest.fn(async () => 0),
      findOne: jest.fn(async () => null),
    };

    dataSource = {
      transaction: jest.fn(async (cb: (m: unknown) => unknown) =>
        cb(transactionManager),
      ),
    };

    userRepo = {
      findOne: jest.fn(async () => makeUser()),
      find: jest.fn(async () => []),
    };

    appealRepo = { find: jest.fn(async () => []) };

    sanctionRepo = {
      findOne: jest.fn(async () => null),
      find: jest.fn(async () => []),
      create: jest.fn((data) => ({ id: 'sanction-new', ...data })),
      save: jest.fn(async (entity) => entity),
    };

    audit = { record: jest.fn(async () => ({}) as never) } as never;
    notifications = { notify: jest.fn(async () => undefined) } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationUsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserSanction), useValue: sanctionRepo },
        {
          provide: getRepositoryToken(IncidentReport),
          useValue: {
            find: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ModerationNote),
          useValue: { find: jest.fn(async () => []) },
        },
        {
          provide: getRepositoryToken(ModerationAppeal),
          useValue: appealRepo,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: ModerationAuditService, useValue: audit },
        { provide: ModerationNotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ModerationUsersService);
  });

  // =======================================================================

  describe('who may be acted upon', () => {
    it('refuses to let a moderator sanction their own account', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'mod-1' }));

      await expect(
        service.warn('mod-1', { reason: 'a valid reason here' }, moderator),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to let a moderator sanction a peer of equal rank', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'mod-2', role: UserRole.MODERATOR }),
      );

      await expect(
        service.warn('mod-2', { reason: 'a valid reason here' }, moderator),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to let a moderator sanction someone more senior', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'admin-9', role: UserRole.ORG_ADMIN }),
      );

      await expect(
        service.warn('admin-9', { reason: 'a valid reason here' }, moderator),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an org admin sanction a moderator', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'mod-5', role: UserRole.MODERATOR }),
      );

      await expect(
        service.warn('mod-5', { reason: 'a valid reason here' }, orgAdmin),
      ).resolves.toBeDefined();
    });

    it('404s on an unknown account', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.warn('ghost', { reason: 'a valid reason here' }, moderator),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // =======================================================================

  describe('warn', () => {
    it('records the sanction, the audit entry and a notice to the user', async () => {
      await service.warn(
        'player-1',
        { reason: 'Posted a doctored image as evidence.' },
        moderator,
      );

      expect(sanctionRepo.save).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          affectedObjectType: 'user',
          affectedObjectId: 'player-1',
          reason: 'Posted a doctored image as evidence.',
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'player-1', email: true }),
      );
    });

    it('does not change the account status', async () => {
      await service.warn(
        'player-1',
        { reason: 'A first, minor breach of the guidelines.' },
        moderator,
      );

      expect(transactionManager.update).not.toHaveBeenCalled();
    });
  });

  // =======================================================================

  describe('suspend', () => {
    it('requires a duration for a temporary suspension', async () => {
      await expect(
        service.suspend('player-1', { reason: 'a valid reason here' }, senior),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a suspension from a role without SUSPEND_USERS', async () => {
      await expect(
        service.suspend(
          'player-1',
          { reason: 'a valid reason here', durationDays: 7 },
          moderator,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a permanent suspension from a senior moderator', async () => {
      // SENIOR_MODERATOR may suspend, but banning is an ORG_ADMIN capability.
      await expect(
        service.suspend(
          'player-1',
          { reason: 'a valid reason here', permanent: true },
          senior,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an org admin to ban', async () => {
      await service.suspend(
        'player-1',
        {
          reason: 'Coordinated inauthentic behaviour across 30 accounts.',
          ban: true,
        },
        orgAdmin,
      );

      expect(transactionManager.create).toHaveBeenCalledWith(
        UserSanction,
        expect.objectContaining({
          type: UserSanctionType.BAN,
          expiresAt: null,
        }),
      );
    });

    it('computes an expiry from durationDays', async () => {
      const before = Date.now();

      await service.suspend(
        'player-1',
        { reason: 'Third upheld harassment report.', durationDays: 7 },
        senior,
      );

      const created = transactionManager.create.mock.calls.find(
        ([entity]: [unknown]) => entity === UserSanction,
      )?.[1];

      const expiresAt = created.expiresAt as Date;
      const days = (expiresAt.getTime() - before) / 86_400_000;
      expect(days).toBeCloseTo(7, 1);
    });

    it('captures the pre-suspension status so a restore can return to it', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ status: UserStatus.ACTIVE }),
      );

      await service.suspend(
        'player-1',
        { reason: 'Third upheld harassment report.', durationDays: 3 },
        senior,
      );

      const created = transactionManager.create.mock.calls.find(
        ([entity]: [unknown]) => entity === UserSanction,
      )?.[1];

      expect(created.previousUserStatus).toBe(UserStatus.ACTIVE);
    });

    it('refuses to stack a second suspension on an already-suspended account', async () => {
      sanctionRepo.findOne.mockResolvedValue(
        makeSanction({ type: UserSanctionType.TEMPORARY_SUSPENSION }),
      );

      await expect(
        service.suspend(
          'player-1',
          { reason: 'Another breach while suspended.', durationDays: 3 },
          senior,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // =======================================================================

  describe('restore', () => {
    it('rejects a restore when nothing is active', async () => {
      sanctionRepo.find.mockResolvedValue([]);

      await expect(
        service.restore('player-1', { reason: 'a valid reason here' }, senior),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns the account to the status captured before enforcement', async () => {
      sanctionRepo.find.mockResolvedValue([
        makeSanction({
          id: 's-1',
          createdAt: new Date('2026-01-02'),
          previousUserStatus: UserStatus.DEACTIVATED,
        }),
        makeSanction({
          id: 's-2',
          createdAt: new Date('2026-03-01'),
          previousUserStatus: UserStatus.SUSPENDED,
        }),
      ]);

      const result = await service.restore(
        'player-1',
        { reason: 'Appeal upheld on review of the original evidence.' },
        senior,
      );

      // The earliest live sanction holds the true pre-enforcement state.
      expect(result.status).toBe(UserStatus.DEACTIVATED);
      expect(result.restored).toBe(2);
    });

    it('leaves the account suspended when another sanction is still live', async () => {
      sanctionRepo.find.mockResolvedValue([makeSanction({ id: 's-1' })]);
      transactionManager.count.mockResolvedValue(1);

      await service.restore(
        'player-1',
        {
          reason: 'Lifting only the warning, the ban stands.',
          sanctionId: 's-1',
        },
        senior,
      );

      const userUpdates = transactionManager.update.mock.calls.filter(
        ([entity]: [unknown]) => entity === User,
      );
      expect(userUpdates).toHaveLength(0);
    });
  });

  // =======================================================================

  describe('computeRiskScore', () => {
    it('is zero for a clean account', () => {
      expect(service.computeRiskScore([], 0)).toBe(0);
    });

    it('weights a ban far above a warning', () => {
      const warned = service.computeRiskScore(
        [makeSanction({ type: UserSanctionType.WARNING })],
        0,
      );
      const banned = service.computeRiskScore(
        [makeSanction({ type: UserSanctionType.BAN })],
        0,
      );

      expect(banned).toBeGreaterThan(warned * 5);
    });

    it('halves the weight of sanctions older than the decay window', () => {
      const recent = service.computeRiskScore(
        [
          makeSanction({
            type: UserSanctionType.TEMPORARY_SUSPENSION,
            createdAt: new Date(),
          }),
        ],
        0,
      );

      const old = service.computeRiskScore(
        [
          makeSanction({
            type: UserSanctionType.TEMPORARY_SUSPENSION,
            createdAt: new Date(Date.now() - 400 * 86_400_000),
          }),
        ],
        0,
      );

      expect(old).toBe(Math.round(recent / 2));
    });

    it('ignores sanctions overturned on appeal', () => {
      const score = service.computeRiskScore(
        [
          makeSanction({
            type: UserSanctionType.BAN,
            status: UserSanctionStatus.OVERTURNED,
          }),
        ],
        0,
      );

      expect(score).toBe(0);
    });

    it('counts upheld reports against the account', () => {
      expect(service.computeRiskScore([], 3)).toBe(24);
    });

    it('never exceeds 100', () => {
      const many = Array.from({ length: 20 }, () =>
        makeSanction({ type: UserSanctionType.BAN }),
      );

      expect(service.computeRiskScore(many, 50)).toBe(100);
    });
  });
    // =======================================================================

    describe('getOwnRecord', () => {
        // This is the one endpoint a sanctioned user can reach, so what it
        // withholds matters as much as what it returns.
        beforeEach(() => {
            sanctionRepo.find.mockResolvedValue([
                makeSanction({
                    id: 's-1',
                    type: UserSanctionType.TEMPORARY_SUSPENSION,
                    reason: 'Third upheld harassment report.',
                    notes: 'Internal: linked to the ring in HT-99A1.',
                    issuedById: 'mod-7',
                }),
            ]);
        });

        it('never exposes internal notes to the subject', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(JSON.stringify(record)).not.toContain('Internal:');
            expect(record.sanctions[0]).not.toHaveProperty('notes');
        });

        it('never exposes the issuing moderator, to prevent retaliation', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(JSON.stringify(record)).not.toContain('mod-7');
            expect(record.sanctions[0]).not.toHaveProperty('issuedById');
            expect(record.sanctions[0]).not.toHaveProperty('issuedBy');
        });

        it('never exposes the risk score', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(record).not.toHaveProperty('riskScore');
        });

        it('does return the reason, so the user knows what they did', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(record.sanctions[0].reason).toBe(
                'Third upheld harassment report.',
            );
        });

        it('marks a recent, un-appealed sanction as appealable', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(record.sanctions[0].isAppealable).toBe(true);
        });

        it('marks a sanction outside the appeal window as not appealable', async () => {
            sanctionRepo.find.mockResolvedValue([
                makeSanction({
                    id: 's-old',
                    createdAt: new Date(Date.now() - 45 * 86_400_000),
                }),
            ]);

            const record = await service.getOwnRecord('player-1');
            expect(record.sanctions[0].isAppealable).toBe(false);
        });

        it('marks an already-appealed sanction as not appealable', async () => {
            appealRepo.find.mockResolvedValue([
                { id: 'a-1', sanctionId: 's-1', status: 'SUBMITTED' },
            ]);

            const record = await service.getOwnRecord('player-1');
            expect(record.sanctions[0].isAppealable).toBe(false);
        });

        it('marks an overturned sanction as not appealable', async () => {
            sanctionRepo.find.mockResolvedValue([
                makeSanction({
                    id: 's-1',
                    status: UserSanctionStatus.OVERTURNED,
                }),
            ]);

            const record = await service.getOwnRecord('player-1');
            expect(record.sanctions[0].isAppealable).toBe(false);
        });

        it('publishes the appeal window so the UI can explain the deadline', async () => {
            const record = await service.getOwnRecord('player-1');

            expect(record.appealWindowDays).toBe(30);
        });
    });
});