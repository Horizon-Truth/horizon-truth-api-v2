/**
 * Dependency-free exporters for tabular report data.
 *
 * The moderation module has to emit CSV, Excel and PDF. Rather than pull in
 * three document libraries for what are, in the end, tables of strings, each
 * format is written directly:
 *
 * - **CSV**   — RFC 4180, with a UTF-8 BOM so Excel opens Amharic and Afaan
 *               Oromo text correctly instead of mojibake.
 * - **Excel** — SpreadsheetML 2003, a single-file XML workbook that Excel,
 *               LibreOffice and Google Sheets all open natively. It avoids the
 *               ZIP container an .xlsx would need.
 * - **PDF**   — a minimal, uncompressed PDF 1.4 using the base-14 Helvetica
 *               fonts, which every reader has built in, so no font embedding
 *               is required.
 *
 * These are deliberately scoped to tabular reports; they are not a general
 * document toolkit.
 */

export type ExportRow = Record<string, unknown>;

export interface ExportColumn {
  key: string;
  header: string;
}

/** Derive columns from the first row when the caller has not specified them. */
export function inferColumns(rows: ExportRow[]): ExportColumn[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]).map((key) => ({
    key,
    header: humanise(key),
  }));
}

// ===========================================================================
// CSV
// ===========================================================================

export function toCsv(rows: ExportRow[], columns?: ExportColumn[]): string {
  const cols = columns ?? inferColumns(rows);
  const lines = [cols.map((c) => csvCell(c.header)).join(',')];

  for (const row of rows) {
    lines.push(cols.map((c) => csvCell(formatValue(row[c.key]))).join(','));
  }

  // The BOM is what makes Excel treat the file as UTF-8 on open. Written as
  // an escape rather than a literal so it survives editors that strip it.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ===========================================================================
// Excel (SpreadsheetML 2003)
// ===========================================================================

export function toExcelXml(
  rows: ExportRow[],
  columns?: ExportColumn[],
  sheetName = 'Report',
): string {
  const cols = columns ?? inferColumns(rows);

  const headerCells = cols
    .map(
      (c) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(
          c.header,
        )}</Data></Cell>`,
    )
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = cols
        .map((c) => {
          const raw = row[c.key];
          if (typeof raw === 'number' && Number.isFinite(raw)) {
            return `<Cell><Data ss:Type="Number">${raw}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${xmlEscape(
            formatValue(raw),
          )}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#EEEEEE" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${xmlEscape(sheetName.slice(0, 31))}">
    <Table>
      <Row>${headerCells}</Row>
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function xmlEscape(value: string): string {
  return (
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Control characters are illegal in XML 1.0 and would corrupt the file,
      // so matching them here is precisely the intent.
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  );
}

// ===========================================================================
// PDF
// ===========================================================================

export interface PdfOptions {
  title: string;
  subtitle?: string;
  /** Extra summary lines printed above the table. */
  summary?: string[];
  landscape?: boolean;
}

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, in points
const MARGIN = 36;
const FONT_SIZE = 8;
const LINE_HEIGHT = 12;

/**
 * Render rows as a paginated PDF table.
 *
 * Returns a Buffer, so the controller can stream it straight to the client.
 */
export function toPdf(
  rows: ExportRow[],
  columns: ExportColumn[] | undefined,
  options: PdfOptions,
): Buffer {
  const cols = columns ?? inferColumns(rows);
  const landscape = options.landscape ?? cols.length > 5;

  const pageWidth = landscape ? PAGE.height : PAGE.width;
  const pageHeight = landscape ? PAGE.width : PAGE.height;

  const usableWidth = pageWidth - MARGIN * 2;
  const columnWidth = cols.length > 0 ? usableWidth / cols.length : usableWidth;
  const maxCharsPerCell = Math.max(
    4,
    Math.floor(columnWidth / (FONT_SIZE * 0.5)),
  );

  const headerBlock: string[] = [];
  headerBlock.push(
    text(MARGIN, pageHeight - MARGIN - 14, options.title, 16, 'F2'),
  );
  if (options.subtitle) {
    headerBlock.push(
      text(MARGIN, pageHeight - MARGIN - 30, options.subtitle, 9, 'F1'),
    );
  }
  (options.summary ?? []).forEach((line, i) => {
    headerBlock.push(
      text(MARGIN, pageHeight - MARGIN - 46 - i * LINE_HEIGHT, line, 9, 'F1'),
    );
  });

  const firstPageTop =
    pageHeight - MARGIN - 52 - (options.summary?.length ?? 0) * LINE_HEIGHT;
  const laterPageTop = pageHeight - MARGIN - 16;

  const pages: string[][] = [];
  let current: string[] = [...headerBlock];
  let y = firstPageTop;

  const drawHeaderRow = (atY: number) => {
    cols.forEach((c, i) => {
      current.push(
        text(
          MARGIN + i * columnWidth,
          atY,
          clip(c.header, maxCharsPerCell),
          FONT_SIZE,
          'F2',
        ),
      );
    });
    // Rule under the header row.
    current.push(
      `0.5 w 0.6 0.6 0.6 RG ${MARGIN} ${atY - 4} m ${
        MARGIN + usableWidth
      } ${atY - 4} l S`,
    );
  };

  drawHeaderRow(y);
  y -= LINE_HEIGHT + 4;

  for (const row of rows) {
    if (y < MARGIN + LINE_HEIGHT) {
      pages.push(current);
      current = [];
      y = laterPageTop;
      drawHeaderRow(y);
      y -= LINE_HEIGHT + 4;
    }

    cols.forEach((c, i) => {
      current.push(
        text(
          MARGIN + i * columnWidth,
          y,
          clip(formatValue(row[c.key]), maxCharsPerCell),
          FONT_SIZE,
          'F1',
        ),
      );
    });

    y -= LINE_HEIGHT;
  }

  pages.push(current);

  return assemblePdf(pages, pageWidth, pageHeight);
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  font: 'F1' | 'F2',
): string {
  return `BT /${font} ${size} Tf 0 0 0 rg ${round(x)} ${round(
    y,
  )} Td (${pdfEscape(value)}) Tj ET`;
}

/**
 * Build the PDF file structure: catalog, page tree, fonts, one content stream
 * per page, then the cross-reference table the reader uses to seek.
 */
function assemblePdf(
  pages: string[][],
  pageWidth: number,
  pageHeight: number,
): Buffer {
  const objects: string[] = [];
  const pageCount = pages.length;

  // Object numbering: 1 catalog, 2 page tree, 3 + 4 fonts,
  // then per page: a page object and its content stream.
  const firstPageObj = 5;
  const pageObjIds = pages.map((_, i) => firstPageObj + i * 2);

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(
    `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjIds
      .map((id) => `${id} 0 R`)
      .join(' ')}] >>`,
  );
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );

  pages.forEach((operators, i) => {
    const contentId = pageObjIds[i] + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${round(pageWidth)} ${round(
        pageHeight,
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );

    const stream = operators.join('\n');
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

/**
 * The base-14 fonts are single-byte WinAnsi, so characters outside it are
 * transliterated to ASCII rather than emitted as broken glyphs. Callers
 * needing full Amharic rendering should export CSV or Excel instead.
 */
function pdfEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/** Truncation marker is ASCII: the base-14 fonts have no ellipsis glyph. */
function clip(value: string, max: number): string {
  return value.length > max
    ? `${value.slice(0, Math.max(1, max - 3))}...`
    : value;
}

function round(value: number): string {
  return value.toFixed(2);
}

// ===========================================================================
// Shared
// ===========================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  // Narrowed to primitives, so this cannot produce '[object Object]'.
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  return JSON.stringify(value) ?? '';
}

function humanise(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Content type and file extension for each supported format. */
export const EXPORT_MIME = {
  csv: { type: 'text/csv; charset=utf-8', extension: 'csv' },
  xlsx: {
    type: 'application/vnd.ms-excel',
    extension: 'xls',
  },
  pdf: { type: 'application/pdf', extension: 'pdf' },
} as const;
