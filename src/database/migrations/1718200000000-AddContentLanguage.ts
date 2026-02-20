import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the multilingual `language` column to all content-bearing tables
 * (scenarios, blogs, resources), backfills every existing row to English,
 * enforces NOT NULL, and indexes the column for language-scoped queries.
 *
 * Strategy for existing data: all pre-existing content is, by definition,
 * English — so we add the column with a DEFAULT of 'en' (which Postgres
 * applies to every existing row), then explicitly backfill any NULLs as a
 * belt-and-suspenders guarantee before adding the NOT NULL constraint.
 */
export class AddContentLanguage1718200000000 implements MigrationInterface {
  name = 'AddContentLanguage1718200000000';

  private readonly targets: { table: string; index: string }[] = [
    { table: 'scenarios', index: 'idx_scenarios_language' },
    { table: 'blogs', index: 'idx_blogs_language' },
    { table: 'resources', index: 'idx_resources_language' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Shared enum type for content languages (idempotent).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_language_enum') THEN
          CREATE TYPE "content_language_enum" AS ENUM ('en', 'am', 'om');
        END IF;
      END
      $$;
    `);

    for (const { table, index } of this.targets) {
      // 2. Add the column with a default so existing rows are backfilled to 'en'.
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "language" "content_language_enum" NOT NULL DEFAULT 'en'`,
      );

      // 3. Explicitly backfill any legacy NULLs (defensive; should be none).
      await queryRunner.query(
        `UPDATE "${table}" SET "language" = 'en' WHERE "language" IS NULL`,
      );

      // 4. Index for language-based filtering.
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${index}" ON "${table}" ("language")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, index } of this.targets) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "language"`,
      );
    }
    await queryRunner.query(`DROP TYPE IF EXISTS "content_language_enum"`);
  }
}
