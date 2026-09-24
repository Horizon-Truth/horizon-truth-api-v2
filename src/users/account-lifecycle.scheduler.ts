import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AccountLifecycleService } from './account-lifecycle.service';

/** Arbitrary constant identifying this job's Postgres advisory lock. */
const ADVISORY_LOCK_KEY = 7_302_411;

const FIRST_RUN_DELAY_MS = 60 * 1000;

/**
 * Runs the account-lifecycle job (erasures and inactivity notices) on an
 * interval. Every run is idempotent, and an advisory lock keeps concurrent API
 * instances from sending duplicate notices.
 *
 * Disable with ACCOUNT_LIFECYCLE_JOB_ENABLED=false; tune with
 * ACCOUNT_LIFECYCLE_INTERVAL_HOURS (default 6).
 */
@Injectable()
export class AccountLifecycleScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(AccountLifecycleScheduler.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly lifecycle: AccountLifecycleService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const enabled =
      this.configService.get<string>('ACCOUNT_LIFECYCLE_JOB_ENABLED') !==
        'false' && process.env.NODE_ENV !== 'test';
    if (!enabled) {
      this.logger.log('Account lifecycle job is disabled.');
      return;
    }

    const hours = Number(
      this.configService.get<string>('ACCOUNT_LIFECYCLE_INTERVAL_HOURS') ?? 6,
    );
    const intervalMs =
      (Number.isFinite(hours) && hours > 0 ? hours : 6) * 60 * 60 * 1000;

    const first = setTimeout(() => void this.tick(), FIRST_RUN_DELAY_MS);
    const repeat = setInterval(() => void this.tick(), intervalMs);
    first.unref();
    repeat.unref();
    this.timers = [first, repeat];
  }

  onApplicationShutdown(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  private async tick(): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      const rows = (await runner.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [ADVISORY_LOCK_KEY],
      )) as Array<{ locked: boolean }>;
      const locked = rows[0]?.locked;
      if (!locked) return; // Another instance is running it.

      try {
        await this.lifecycle.runOnce();
      } finally {
        await runner.query('SELECT pg_advisory_unlock($1)', [
          ADVISORY_LOCK_KEY,
        ]);
      }
    } catch (err) {
      this.logger.error(
        `Account lifecycle run failed: ${(err as Error).message}`,
      );
    } finally {
      await runner.release();
    }
  }
}
