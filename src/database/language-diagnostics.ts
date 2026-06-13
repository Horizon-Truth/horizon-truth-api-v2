import { AppDataSource } from './data-source';
import {
  SUPPORTED_LANGUAGE_CODES,
  DEFAULT_CONTENT_LANGUAGE,
} from '../shared/enums/content-language.enum';

/**
 * Diagnostics utility to verify the multilingual content system is healthy.
 *
 * For every content table it reports the row count per supported language and
 * flags any rows whose language is NULL or outside the supported set (which
 * would indicate content that could bypass language filtering).
 *
 * Run with: `npm run lang:diagnostics`
 */
const CONTENT_TABLES = ['scenarios', 'blogs', 'resources'];

async function run(): Promise<void> {
  await AppDataSource.initialize();
  console.log('🌐 Content language diagnostics\n');

  let problems = 0;

  for (const table of CONTENT_TABLES) {
    const rows: { language: string | null; count: string }[] =
      await AppDataSource.query(
        `SELECT "language"::text AS language, COUNT(*) AS count FROM "${table}" GROUP BY "language" ORDER BY "language"`,
      );

    console.log(`Table: ${table}`);
    if (rows.length === 0) {
      console.log('  (no rows)');
    }

    for (const row of rows) {
      const valid =
        row.language !== null &&
        SUPPORTED_LANGUAGE_CODES.includes(row.language as never);
      const marker = valid ? '✓' : '✗ UNSUPPORTED/NULL';
      if (!valid) problems += Number(row.count);
      console.log(`  ${marker}  ${row.language ?? 'NULL'}: ${row.count}`);
    }
    console.log('');
  }

  console.log(`Default language: ${DEFAULT_CONTENT_LANGUAGE}`);
  if (problems > 0) {
    console.error(
      `⚠️  ${problems} content row(s) have an invalid/missing language and may bypass filtering.`,
    );
  } else {
    console.log('✅ All content rows have a valid language.');
  }

  await AppDataSource.destroy();
  process.exit(problems > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Diagnostics failed:', err);
  process.exit(1);
});
