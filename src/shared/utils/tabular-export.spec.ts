import {
  inferColumns,
  toCsv,
  toExcelXml,
  toPdf,
  EXPORT_MIME,
} from './tabular-export';

const rows = [
  { caseNumber: 'HT-4F2A19', status: 'RESOLVED', resolutionSeconds: 3600 },
  { caseNumber: 'HT-9C31D0', status: 'DISMISSED', resolutionSeconds: 120 },
];

describe('inferColumns', () => {
  it('derives readable headers from camelCase keys', () => {
    expect(inferColumns(rows)).toEqual([
      { key: 'caseNumber', header: 'Case Number' },
      { key: 'status', header: 'Status' },
      { key: 'resolutionSeconds', header: 'Resolution Seconds' },
    ]);
  });

  it('returns nothing for an empty result set', () => {
    expect(inferColumns([])).toEqual([]);
  });
});

describe('toCsv', () => {
  it('starts with a BOM so Excel reads it as UTF-8', () => {
    expect(toCsv(rows).charCodeAt(0)).toBe(0xfeff);
  });

  it('writes a header row followed by one row per record', () => {
    const lines = toCsv(rows).replace('﻿', '').trim().split('\r\n');

    expect(lines[0]).toBe('Case Number,Status,Resolution Seconds');
    expect(lines).toHaveLength(3);
  });

  it('quotes and escapes values containing commas or quotes', () => {
    const csv = toCsv([{ note: 'He said "stop", loudly' }]);

    expect(csv).toContain('"He said ""stop"", loudly"');
  });

  it('keeps a newline inside a quoted cell rather than breaking the row', () => {
    const csv = toCsv([{ note: 'line one\nline two' }]);

    expect(csv).toContain('"line one\nline two"');
  });

  it('renders null and undefined as empty cells', () => {
    const csv = toCsv([{ a: null, b: undefined, c: 'x' }]);

    expect(csv.replace('﻿', '').trim().split('\r\n')[1]).toBe(',,x');
  });

  it('preserves non-Latin text', () => {
    const csv = toCsv([{ label: 'የጥላቻ ንግግር' }]);

    expect(csv).toContain('የጥላቻ ንግግር');
  });
});

describe('toExcelXml', () => {
  it('emits a workbook Excel recognises', () => {
    const xml = toExcelXml(rows);

    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('urn:schemas-microsoft-com:office:spreadsheet');
  });

  it('types numbers as numbers so they sort correctly in the sheet', () => {
    const xml = toExcelXml(rows);

    expect(xml).toContain('<Data ss:Type="Number">3600</Data>');
  });

  it('escapes XML metacharacters in cell values', () => {
    const xml = toExcelXml([{ note: '<script> & "quotes"' }]);

    expect(xml).toContain('&lt;script&gt; &amp; &quot;quotes&quot;');
    expect(xml).not.toContain('<script>');
  });

  it('strips control characters that would make the file unparseable', () => {
    const xml = toExcelXml([{ note: `badchar` }]);

    expect(xml).toContain('badchar');
  });

  it('truncates the sheet name to Excel’s 31-character limit', () => {
    const xml = toExcelXml(rows, undefined, 'A'.repeat(40));

    expect(xml).toContain(`ss:Name="${'A'.repeat(31)}"`);
  });
});

describe('toPdf', () => {
  it('produces a well-formed PDF document', () => {
    const pdf = toPdf(rows, undefined, { title: 'Moderation Report' });
    const text = pdf.toString('latin1');

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('xref');
  });

  it('paginates long result sets', () => {
    const many = Array.from({ length: 400 }, (_, i) => ({
      caseNumber: `HT-${i}`,
      status: 'RESOLVED',
    }));

    const text = toPdf(many, undefined, { title: 'Big' }).toString('latin1');
    const pageCount = (text.match(/\/Type \/Page[^s]/g) ?? []).length;

    expect(pageCount).toBeGreaterThan(1);
  });

  it('renders the title and summary lines', () => {
    const text = toPdf(rows, undefined, {
      title: 'Moderation Report',
      subtitle: 'July 2026',
      summary: ['Cases: 2'],
    }).toString('latin1');

    expect(text).toContain('(Moderation Report)');
    expect(text).toContain('(July 2026)');
    expect(text).toContain('(Cases: 2)');
  });

  it('escapes parentheses and backslashes, which delimit PDF strings', () => {
    const text = toPdf([{ note: 'a (b) \\ c' }], undefined, {
      title: 'T',
    }).toString('latin1');

    expect(text).toContain('a \\(b\\) \\\\ c');
  });

  it('substitutes characters the base-14 fonts cannot render', () => {
    // Amharic has no glyph in WinAnsi; it degrades to '?' rather than
    // producing a corrupt stream. CSV and Excel remain the lossless options.
    const text = toPdf([{ label: 'የጥላቻ' }], undefined, {
      title: 'T',
    }).toString('latin1');

    expect(text).not.toContain('የ');
    expect(text).toContain('?');
  });

  it('handles an empty result set without producing a broken file', () => {
    const text = toPdf([], undefined, { title: 'Nothing' }).toString('latin1');

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('declares byte offsets that match the object positions', () => {
    // A wrong xref table is the most common way a hand-built PDF fails to
    // open, so the offsets are checked against the bytes themselves.
    const pdf = toPdf(rows, undefined, { title: 'T' });
    const text = pdf.toString('latin1');

    const xrefStart = text.lastIndexOf('xref');
    const offsets = text
      .slice(xrefStart)
      .split('\n')
      .filter((line) => /^\d{10} \d{5} n\s*$/.test(line))
      .map((line) => Number(line.slice(0, 10)));

    offsets.forEach((offset, index) => {
      expect(text.slice(offset, offset + 20)).toContain(`${index + 1} 0 obj`);
    });
  });
});

describe('EXPORT_MIME', () => {
  it('maps each format to a content type and extension', () => {
    expect(EXPORT_MIME.csv.type).toContain('text/csv');
    expect(EXPORT_MIME.pdf.type).toBe('application/pdf');
    expect(EXPORT_MIME.xlsx.extension).toBe('xls');
  });
});
