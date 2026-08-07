import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { IncidentReport } from '../../incidents/entities/incident-report.entity';
import { IncidentStatus } from '../../incidents/entities/incident-status.entity';
import { ModerationAction } from '../../incidents/entities/moderation-action.entity';
import { Content } from '../../incidents/entities/content.entity';
import { User } from '../../users/entities/user.entity';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

import { ModerationFlag } from './moderation-flag.entity';
import { ModerationFlagAssignment } from './moderation-flag-assignment.entity';
import { ModerationNote } from './moderation-note.entity';
import { ModerationNoteRevision } from './moderation-note-revision.entity';
import { ModerationAppeal } from './moderation-appeal.entity';
import { UserSanction } from './user-sanction.entity';
import { ContentModerationState } from './content-moderation-state.entity';
import { ModerationNotification } from './moderation-notification.entity';
import { ModerationSavedFilter } from './moderation-saved-filter.entity';

const MODERATION_ENTITIES = [
  IncidentReport,
  IncidentStatus,
  ModerationAction,
  Content,
  User,
  AuditLog,
  ModerationFlag,
  ModerationFlagAssignment,
  ModerationNote,
  ModerationNoteRevision,
  ModerationAppeal,
  UserSanction,
  ContentModerationState,
  ModerationNotification,
  ModerationSavedFilter,
];

/**
 * Every `*.entity.ts` under `src`, loaded synchronously.
 *
 * `AppModule` uses a glob for the same set, but TypeORM resolves globs
 * asynchronously — `buildMetadatas()` would race the loader and see an empty
 * list. Requiring the files ourselves keeps it deterministic.
 *
 * The whole graph is loaded rather than the moderation subset because entity
 * relations reach outward (`User` → `PlayerProfile`), and this is the schema
 * that has to build in production.
 */
function loadAllEntities(): Function[] {
  const root = join(__dirname, '..', '..');
  const found: Function[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith('.entity.ts')) {
        const module = require(path) as Record<string, unknown>;
        for (const exported of Object.values(module)) {
          if (typeof exported === 'function') found.push(exported);
        }
      }
    }
  };

  walk(root);
  return found;
}

/**
 * Builds the TypeORM metadata against the Postgres driver, without connecting
 * to a database.
 *
 * This exists because of a real failure: `duplicateOfId?: string | null` with a
 * bare `@Column({ nullable: true })` reflects as `design:type = Object`, which
 * Postgres cannot map. It compiled, every unit test passed, and the application
 * then refused to boot — nothing in the suite had ever asked TypeORM to
 * interpret a decorator.
 */
function buildMetadata(): DataSource {
  const dataSource = new DataSource({
    type: 'postgres',
    entities: loadAllEntities(),
    synchronize: false,
  });

  // `buildMetadatas` is what `initialize()` calls after connecting. Invoking it
  // directly gives us the validation without needing a live server.
  (dataSource as unknown as { buildMetadatas: () => void }).buildMetadatas();

  return dataSource;
}

describe('Moderation entity metadata', () => {
  let dataSource: DataSource;

  beforeAll(() => {
    dataSource = buildMetadata();
  });

  it('builds and validates against the Postgres driver', () => {
    // A column type Postgres cannot map throws inside buildMetadatas, so
    // reaching this assertion is itself the test.
    expect(dataSource.entityMetadatas.length).toBeGreaterThanOrEqual(
      MODERATION_ENTITIES.length,
    );
  });

  it('includes every moderation entity', () => {
    const built = new Set(dataSource.entityMetadatas.map((e) => e.name));

    for (const entity of MODERATION_ENTITIES) {
      expect(built.has(entity.name)).toBe(true);
    }
  });

  it('resolves a concrete database type for every column', () => {
    const unresolved: string[] = [];

    const names = new Set(MODERATION_ENTITIES.map((e) => e.name));

    for (const entity of dataSource.entityMetadatas) {
      if (!names.has(entity.name)) continue;

      for (const column of entity.columns) {
        const type = column.type as unknown;
        // An unresolved type surfaces as the `Object` constructor rather than
        // a driver type string or a supported constructor.
        if (type === Object) {
          unresolved.push(`${entity.name}.${column.propertyName}`);
        }
      }
    }

    expect(unresolved).toEqual([]);
  });

  it('gives every nullable foreign-key column an explicit uuid type', () => {
    // `string | null` never reflects usefully, so these must be declared.
    const names = new Set(MODERATION_ENTITIES.map((e) => e.name));

    const idColumns = dataSource.entityMetadatas
      .filter((entity) => names.has(entity.name))
      .flatMap((entity) =>
        entity.columns
          .filter(
            (column) =>
              column.isNullable &&
              /Id$/.test(column.propertyName) &&
              column.propertyName !== 'id',
          )
          .map((column) => ({
            name: `${entity.name}.${column.propertyName}`,
            type: String(column.type),
          })),
      );

    expect(idColumns.length).toBeGreaterThan(0);

    const wrong = idColumns.filter(
      (c) => c.type !== 'uuid' && c.type !== 'varchar',
    );
    expect(wrong).toEqual([]);
  });

  it('keeps the case-number and appeal-number columns unique', () => {
    const cases = dataSource.getMetadata(IncidentReport);
    const caseNumber = cases.columns.find(
      (c) => c.propertyName === 'caseNumber',
    );

    expect(caseNumber?.entityMetadata.uniques.length ?? 0).toBeGreaterThan(0);
  });

  it('declares the partial unique index that blocks duplicate live flags', () => {
    // Postgres treats NULLs as distinct, so only the WHERE predicate actually
    // prevents a second live copy of the same flag on a target.
    const assignments = dataSource.getMetadata(ModerationFlagAssignment);
    const index = assignments.indices.find(
      (i) => i.name === 'uq_active_flag_per_target',
    );

    expect(index).toBeDefined();
    expect(index?.isUnique).toBe(true);
    expect(index?.where).toContain('removed_at');
  });

  it('cascades case deletion to the status history and action trail', () => {
    for (const entity of [IncidentStatus, ModerationAction]) {
      const relation = dataSource
        .getMetadata(entity)
        .relations.find((r) => r.propertyName === 'incidentReport');

      expect(relation?.onDelete).toBe('CASCADE');
    }
  });

  it('keeps flags and appeals when their originating case is removed', () => {
    // The audit story must survive a deleted case, so these detach rather
    // than cascade.
    for (const entity of [ModerationFlagAssignment, ModerationAppeal]) {
      const relation = dataSource
        .getMetadata(entity)
        .relations.find((r) => r.propertyName === 'incidentReport');

      expect(relation?.onDelete).toBe('SET NULL');
    }
  });
});
