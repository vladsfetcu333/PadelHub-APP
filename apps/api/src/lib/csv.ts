/**
 * Small CSV writer — escapes fields per RFC 4180 and assembles rows.
 *
 * Why hand-rolled instead of papaparse? The dependency is overkill for
 * the few hundred bytes of CSV the player-export route emits, and
 * keeping it in-tree means we can unit-test the escape rules directly.
 *
 * Escape rules (RFC 4180):
 *   - A field containing comma, double-quote, CR, or LF must be wrapped
 *     in double quotes.
 *   - Embedded double quotes are escaped by doubling them ("" inside "").
 *   - Everything else is emitted verbatim.
 *
 * The output prepends a UTF-8 BOM (U+FEFF) so Excel on Windows opens
 * Romanian diacritics correctly. The BOM is built at runtime via
 * String.fromCharCode(0xFEFF) so the source file stays ASCII-clean and
 * the no-irregular-whitespace lint rule is happy.
 */

const NEEDS_QUOTING = /[",\r\n]/;

/** UTF-8 BOM. Excel uses it to auto-detect UTF-8 encoding on import.
 *  Built via String.fromCharCode so the source file itself stays
 *  ASCII-clean and the no-irregular-whitespace lint rule is happy. */
export const UTF8_BOM = String.fromCharCode(0xfeff);

/** Escape a single CSV cell. Numbers, booleans, null/undefined are coerced. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (s === '') return '';
  if (NEEDS_QUOTING.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Join a single row of cells. */
export function csvRow(cells: ReadonlyArray<unknown>): string {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * Build a complete CSV string from a list of rows. Lines are joined with CRLF
 * (RFC 4180). The result starts with a UTF-8 BOM so Excel auto-detects the
 * encoding and Romanian diacritics (ș, ț, ă, â, î) display correctly.
 */
export function buildCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  return UTF8_BOM + rows.map(csvRow).join('\r\n') + '\r\n';
}

/** Emit a `# comment` line. CSV doesn't have native comments but Excel /
 *  LibreOffice / Sheets tolerate leading-# lines; the escape rules still
 *  apply (the # is at the start of an unquoted cell). */
export function csvComment(text: string): ReadonlyArray<string> {
  return [`# ${text}`];
}

/** Emit a section heading row like `## Sumar`. */
export function csvSection(title: string): ReadonlyArray<string> {
  return [`## ${title}`];
}

/** A blank separator row. */
export const CSV_BLANK_ROW: ReadonlyArray<string> = [''];
