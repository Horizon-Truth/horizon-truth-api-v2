import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds AI verification attempts for crowdsourced reports.
 *
 * Purely additive: no existing table or column changes, and every report
 * predating this table simply has no attempts (the API serves `null` for those).
 */
export class AddReportAiVerification1755300000000 implements MigrationInterface {
  name = 'AddReportAiVerification1755300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_ai_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        claim TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        verdict VARCHAR(64),
        confidence VARCHAR(32),
        reasoning TEXT,
        evidence_summary TEXT,
        sources JSONB,
        provider VARCHAR(255),
        model VARCHAR(255),
        error_message TEXT,
        requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
        -- TIMESTAMPTZ (unlike the naive TIMESTAMP on older tables): the retry
        -- cooldown compares these to the application clock, which is wrong by
        -- the offset if the app server and Postgres disagree on timezone.
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // The hot query is "newest attempt for this report".
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_ai_verifications_report_created
      ON report_ai_verifications (report_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_report_ai_verifications_report_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_ai_verifications`);
  }
}
