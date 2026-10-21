import { describe, it, expect } from 'vitest';
import { sanitizeCsvField, generateCsv } from '../utils/sanitizeCsv.js';

describe('CSV Formula Injection Prevention', () => {
  it('neutralizes formula injection characters (=, +, -, @, tab, return)', () => {
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvField('+12345')).toBe("'+12345");
    expect(sanitizeCsvField('-CMD|/C')).toBe("'-CMD|/C");
    expect(sanitizeCsvField('@SUM(1+1)')).toBe("'@SUM(1+1)");
    expect(sanitizeCsvField('\tCMD')).toBe("'\tCMD");
  });

  it('quotes fields containing commas or quotes', () => {
    expect(sanitizeCsvField('Hello, World')).toBe('"Hello, World"');
    expect(sanitizeCsvField('Quote "test" here')).toBe('"Quote ""test"" here"');
  });

  it('escapes properly in generateCsv matrix', () => {
    const headers = ['Name', 'Formula'];
    const rows = [
      ['Safe User', '=cmd|calc.exe'],
      ['Another, User', 'Normal Text'],
    ];

    const csv = generateCsv(headers, rows);
    expect(csv).toContain("'=cmd|calc.exe");
    expect(csv).toContain('"Another, User"');
  });
});
