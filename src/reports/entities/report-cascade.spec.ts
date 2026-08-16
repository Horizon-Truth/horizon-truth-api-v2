import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { Report } from './report.entity';
import { ReportVerification } from './report-verification.entity';
import { ReportEvidence } from './report-evidence.entity';
import { ReportAiVerification } from './report-ai-verification.entity';

/**
 * Loads every `*.entity.ts` under `src` so relations that reach outward
 * (`Report` → `User`) resolve. Mirrors the approach in the moderation
 * entity-metadata spec.
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
 * Guards a bug that reached production: deleting a report that had any
 * community verification failed with a foreign key violation, because the
 * relation did not declare a delete rule.
 *
 * The assertion is on entity metadata rather than a live schema because the
 * application runs with `synchronize: true` — the decorators, not the
 * migrations, are what actually shape the running database.
 */
describe('Report child cascade rules', () => {
  let dataSource: DataSource;

  beforeAll(() => {
    dataSource = new DataSource({
      type: 'postgres',
      entities: loadAllEntities(),
      synchronize: false,
    });
    (dataSource as unknown as { buildMetadatas: () => void }).buildMetadatas();
  });

  const children = [
    ['community verifications', ReportVerification],
    ['evidence', ReportEvidence],
    ['AI verifications', ReportAiVerification],
  ] as const;

  it.each(children)('deletes %s with their report', (_label, entity) => {
    const metadata = dataSource.getMetadata(entity);
    const relation = metadata.relations.find((candidate) => candidate.propertyName === 'report');

    expect(relation).toBeDefined();
    expect(relation!.inverseEntityMetadata.target).toBe(Report);
    // Without this, removing a report raises a 23503 foreign key violation and
    // the delete endpoint answers 500.
    expect(relation!.onDelete).toBe('CASCADE');
  });
});
