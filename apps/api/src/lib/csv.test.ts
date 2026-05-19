import { describe, expect, it } from 'vitest';
import { escapeCsvCell, csvRow, buildCsv } from './csv.js';

describe('csv utility', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null/undefined/""', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
      expect(escapeCsvCell('')).toBe('');
    });

    it('emits plain strings unquoted', () => {
      expect(escapeCsvCell('andrei_pop')).toBe('andrei_pop');
      expect(escapeCsvCell('Padel Berceni')).toBe('Padel Berceni');
    });

    it('preserves Romanian diacritics verbatim', () => {
      expect(escapeCsvCell('Constanța')).toBe('Constanța');
      expect(escapeCsvCell('Iași Padel')).toBe('Iași Padel');
    });

    it('wraps fields with commas in double quotes', () => {
      expect(escapeCsvCell('Sfetcu, Vlad')).toBe('"Sfetcu, Vlad"');
    });

    it('doubles embedded quotes and wraps the cell', () => {
      expect(escapeCsvCell('She said "hi"')).toBe('"She said ""hi"""');
    });

    it('quotes cells containing newlines (CR or LF)', () => {
      expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
    });

    it('coerces numbers and booleans to strings', () => {
      expect(escapeCsvCell(42)).toBe('42');
      expect(escapeCsvCell(0)).toBe('0');
      expect(escapeCsvCell(true)).toBe('true');
      expect(escapeCsvCell(0.638)).toBe('0.638');
    });
  });

  describe('csvRow', () => {
    it('joins cells with commas', () => {
      expect(csvRow(['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('handles mixed types and tricky cells', () => {
      expect(csvRow(['andrei, pop', 12, 0.75])).toBe('"andrei, pop",12,0.75');
    });

    it('emits empty cells correctly', () => {
      expect(csvRow(['a', '', 'c'])).toBe('a,,c');
      expect(csvRow([null, undefined, ''])).toBe(',,');
    });
  });

  describe('buildCsv', () => {
    it('prepends a UTF-8 BOM', () => {
      const csv = buildCsv([['a']]);
      // BOM is U+FEFF
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('joins rows with CRLF and appends trailing CRLF', () => {
      const csv = buildCsv([
        ['header1', 'header2'],
        ['v1', 'v2'],
      ]);
      // strip BOM for comparison
      expect(csv.slice(1)).toBe('header1,header2\r\nv1,v2\r\n');
    });

    it('handles club names with commas correctly', () => {
      const csv = buildCsv([
        ['Club', 'Meciuri'],
        ['Padel Hub, Berceni', 18],
      ]);
      expect(csv.slice(1)).toBe('Club,Meciuri\r\n"Padel Hub, Berceni",18\r\n');
    });
  });
});
