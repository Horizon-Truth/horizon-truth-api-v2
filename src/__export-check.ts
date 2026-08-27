import { toPdf, toCsv, toExcelXml } from './shared/utils/tabular-export';
import { writeFileSync } from 'fs';
const rows = Array.from({ length: 120 }, (_, i) => ({
  caseNumber: `HT-00${i}`,
  status: i % 3 ? 'RESOLVED' : 'DISMISSED',
  severity: 'HIGH',
  reason: 'HATE_SPEECH',
  targetType: 'COMMENT',
  createdAt: new Date(),
  resolutionSeconds: 1200 + i,
}));
const dir =
  '/private/tmp/claude-501/-Users-nexaitsolution-Documents-projects-full-project-horizon/06ea463b-3c91-4647-877d-9411bbf5e08d/scratchpad';
writeFileSync(
  `${dir}/t.pdf`,
  toPdf(rows, undefined, {
    title: 'Moderation Report',
    subtitle: '2026-07-01 to 2026-08-01',
    summary: ['Cases: 120', 'Upheld: 80'],
  }),
);
writeFileSync(`${dir}/t.csv`, toCsv(rows));
writeFileSync(`${dir}/t.xls`, toExcelXml(rows, undefined, 'Moderation'));
console.log('written');
