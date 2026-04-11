import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportModerationFields1753000000000 implements MigrationInterface {
  name = 'AddReportModerationFields1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reported_content_reference VARCHAR(255),