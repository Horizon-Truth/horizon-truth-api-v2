import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Account deletion & inactivity policy.
 *
 * Adds the columns the account-lifecycle job works from, and backfills
 * `last_active_at` from the activity history we already have. The backfill
 * matters: `last_login_at` was never written before this change, so without
 * it every long-standing player would look inactive since sign-up and receive
 * an inactivity notice on the first run.
 */
export class AddAccountLifecycle1756000000000 implements MigrationInterface {
  name = 'AddAccountLifecycle1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TIMESTAMPTZ: these are compared to the application clock.
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS inactivity_notice_sent_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      UPDATE users u SET last_active_at = GREATEST(
        u.created_at,
        u.last_login_at,
        (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id),
        (SELECT MAX(a.created_at) FROM user_activities a WHERE a.user_id = u.id),
        (SELECT MAX(p.created_at) FROM player_actions p WHERE p.user_id = u.id)
      )
      WHERE u.last_active_at IS NULL
    `);

    // Existing self-service deletions predate the recovery window; give them
    // the full 30 days from now rather than purging them on the first run.
    await queryRunner.query(`
      UPDATE users SET deletion_scheduled_at = now() + INTERVAL '30 days'
      WHERE deleted_at IS NOT NULL AND deletion_scheduled_at IS NULL
        AND status <> 'ANONYMIZED'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at
      ON users (deletion_scheduled_at) WHERE purged_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_users_deletion_scheduled_at`,
    );
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS purged_at,
        DROP COLUMN IF EXISTS inactivity_notice_sent_at,
        DROP COLUMN IF EXISTS deletion_scheduled_at,
        DROP COLUMN IF EXISTS last_active_at
    `);
  }
}
