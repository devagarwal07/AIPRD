import { describe, it, expect } from 'vitest';
import { arrayToCSV } from '../integrations';

describe('arrayToCSV edge quoting', () => {
  it('escapes commas, quotes, and newlines correctly', () => {
    const rows = [
      ['Plain', 'With,Comma', 'He said "Hello"', 'Multi\nLine'],
      ['"startquote"', 'comma,and"quote"', 'line1\nline2', 'simple']
    ];
    const csv = arrayToCSV(rows);
    // Presence checks (avoid naive row splitting because of embedded newlines)
    expect(csv).toContain('"With,Comma"');
    expect(csv).toContain('"He said ""Hello"""');
    expect(csv).toContain('"Multi\nLine"');
    expect(csv).toContain('"""startquote"""');
    expect(csv).toContain('"comma,and""quote"""');
    expect(csv).toContain('"line1\nline2"');
  });
});
