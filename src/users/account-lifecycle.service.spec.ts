import { ConfigService } from '@nestjs/config';
import { AccountLifecycleService } from './account-lifecycle.service';

const DAY = 24 * 60 * 60 * 1000;

describe('AccountLifecycleService', () => {
  const now = new Date('2026-09-24T12:00:00Z');

  let usersRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    query: jest.Mock;
  };
  let mailService: { isConfigured: boolean; send: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const build = (env: Record<string, string> = {}) =>
    new AccountLifecycleService(
      usersRepository as any,
      dataSource as any,
      mailService as any,
      { get: (key: string) => env[key] } as unknown as ConfigService,
    );

  beforeEach(() => {
    usersRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    mailService = { isConfigured: true, send: jest.fn() };
    dataSource = { transaction: jest.fn() };
  });

  describe('policy', () => {
    it('defaults to a 30-day recovery window and 2 years of inactivity with 30 days notice', () => {
      expect(build().policy).toEqual({
        deletionGraceDays: 30,
        inactiveDays: 730,
        noticeDays: 30,
      });
    });

    it('reads overrides from the environment', () => {
      expect(
        build({
          INACTIVE_ACCOUNT_DAYS: '365',
          INACTIVE_ACCOUNT_NOTICE_DAYS: '14',
        }).policy,
      ).toMatchObject({ inactiveDays: 365, noticeDays: 14 });
    });

    it('rejects a notice period that is not shorter than the inactivity period', () => {
      expect(() =>
        build({
          INACTIVE_ACCOUNT_DAYS: '30',
          INACTIVE_ACCOUNT_NOTICE_DAYS: '30',
        }),
      ).toThrow(/must be smaller/);
    });

    it('rejects values that are not whole days', () => {
      expect(() => build({ ACCOUNT_DELETION_GRACE_DAYS: 'soon' })).toThrow(
        /positive whole number/,
      );
    });
  });

  describe('needsActivityUpdate', () => {
    it('writes at most once an hour', () => {
      const service = build();
      const base = { deletedAt: null, deletionScheduledAt: null };
      expect(
        service.needsActivityUpdate(
          { ...base, lastActiveAt: new Date(now.getTime() - 10 * 60 * 1000) },
          now,
        ),
      ).toBe(false);
      expect(
        service.needsActivityUpdate(
          {
            ...base,
            lastActiveAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
          now,
        ),
      ).toBe(true);
      expect(
        service.needsActivityUpdate({ ...base, lastActiveAt: null }, now),
      ).toBe(true);
    });

    it('cancels a pending inactivity deletion immediately', () => {
      expect(
        build().needsActivityUpdate(
          { deletedAt: null, deletionScheduledAt: now, lastActiveAt: now },
          now,
        ),
      ).toBe(true);
    });

    it('never touches an account pending a user-requested deletion', () => {
      expect(
        build().needsActivityUpdate(
          { deletedAt: now, deletionScheduledAt: now, lastActiveAt: null },
          now,
        ),
      ).toBe(false);
    });
  });

  describe('inactivity notices', () => {
    const candidate = (lastSeen: Date) => ({
      id: 'u1',
      email: 'player@example.com',
      full_name: 'Player One',
      last_seen: lastSeen,
    });

    it('emails the player and schedules deletion after the full notice period', async () => {
      usersRepository.query.mockResolvedValue([
        candidate(new Date(now.getTime() - 700 * DAY)),
      ]);

      const result = await build().runOnce(now);

      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'player@example.com' }),
      );
      expect(usersRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1' }),
        {
          inactivityNoticeSentAt: now,
          deletionScheduledAt: new Date(now.getTime() + 30 * DAY),
        },
      );
      expect(result.noticesSent).toBe(1);
    });

    it('does not schedule deletion when the notice could not be delivered', async () => {
      usersRepository.query.mockResolvedValue([candidate(new Date(0))]);
      mailService.send.mockRejectedValue(new Error('bounced'));

      const result = await build().runOnce(now);

      expect(result).toMatchObject({ noticesSent: 0, noticesFailed: 1 });
      expect(usersRepository.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1' }),
        expect.anything(),
      );
    });

    it('sends no notices, and so deletes nothing for inactivity, when mail is not configured', async () => {
      mailService.isConfigured = false;

      await build().runOnce(now);

      expect(usersRepository.query).not.toHaveBeenCalled();
    });

    it('only considers player accounts, noticed once, with the pre-notice cutoff', async () => {
      await build().runOnce(now);

      const [sql, params] = usersRepository.query.mock.calls[0];
      expect(sql).toMatch(/u\.role = \$1/);
      expect(sql).toMatch(/deletion_scheduled_at IS NULL/);
      expect(params[0]).toBe('PLAYER');
      expect(params[2]).toEqual(new Date(now.getTime() - 700 * DAY));
    });
  });

  describe('due erasures', () => {
    it('clears a stale inactivity schedule instead of erasing an account that came back', async () => {
      usersRepository.find.mockResolvedValue([
        {
          id: 'u2',
          deletedAt: null,
          deletionScheduledAt: new Date(now.getTime() - DAY),
          inactivityNoticeSentAt: new Date(now.getTime() - 31 * DAY),
          lastActiveAt: new Date(now.getTime() - 5 * DAY),
        },
      ]);

      const result = await build().runOnce(now);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(result).toMatchObject({ purged: 0, schedulesCleared: 1 });
    });

    it('erases user-requested deletions once the recovery window has ended', async () => {
      usersRepository.find.mockResolvedValue([
        {
          id: 'u3',
          deletedAt: new Date(now.getTime() - 31 * DAY),
          deletionScheduledAt: new Date(now.getTime() - DAY),
        },
      ]);
      dataSource.transaction.mockResolvedValue(true);

      const result = await build().runOnce(now);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result.purged).toBe(1);
    });
  });
});
