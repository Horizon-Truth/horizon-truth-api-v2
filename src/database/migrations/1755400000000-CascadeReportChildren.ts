import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes report children cascade on delete.
 *
 * Deleting a report that had any community verification failed with a foreign
 * key violation (500), because `report_verifications.report_id` was created
 * without ON DELETE CASCADE. `report_evidence` had the same gap — its original
 * migration declared the cascade, but `synchronize` later rebuilt the
 * constraint from entity metadata that did not.
 *
 * Constraint names are TypeORM hashes, so they are looked up from the catalogue
 * rather than hard-coded; that also makes this safe on databases built by
 * synchronize instead of migrations.
 */
export class CascadeReportChildren1755400000000 implements MigrationInterface {
  name = 'CascadeReportChildren1755400000000';

  private static readonly CHILD_TABLES = ['report_verifications', 'report_evidence'];

  private async recreateForeignKey(
    queryRunner: QueryRunner,
    table: string,
    deleteRule: 'CASCADE' | 'NO ACTION',
  ): Promise<void> {
    const existing: { constraint_name: string }[] = await queryRunner.query(
      `
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND kcu.column_name = 'report_id'
        AND ccu.table_name = 'reports'
      `,
      [table],
    );

    for (const { constraint_name } of existing) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraint_name}"`);
    }

    const name = `FK_${table}_report_id`;
    await queryRunner.query(
      `ALTER TABLE "${table}"
       ADD CONSTRAINT "${name}"
       FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE ${deleteRule}`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of CascadeReportChildren1755400000000.CHILD_TABLES) {
      await this.recreateForeignKey(queryRunner, table, 'CASCADE');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of CascadeReportChildren1755400000000.CHILD_TABLES) {
      await this.recreateForeignKey(queryRunner, table, 'NO ACTION');
    }
  }
}
