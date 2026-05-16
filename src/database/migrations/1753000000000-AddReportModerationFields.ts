import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportModerationFields1753000000000 implements MigrationInterface {
  name = 'AddReportModerationFields1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reported_content_reference VARCHAR(255),
      ADD COLUMN IF NOT EXISTS evidence_links JSONB,
      ADD COLUMN IF NOT EXISTS related_report_ids JSONB,
      ADD COLUMN IF NOT EXISTS moderator_notes TEXT,
      ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS duplicate_of_id UUID,
      ADD COLUMN IF NOT EXISTS reviewer_id UUID
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,