/**
 * Sanitizes a string or value for safe inclusion in a CSV file,
 * preventing CSV / Formula Injection attacks in Microsoft Excel and LibreOffice.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Characters that can trigger formula execution in spreadsheet software
  const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  // Check if string starts with any formula indicator
  if (formulaPrefixes.some((prefix) => str.startsWith(prefix))) {
    // Prepend a single quote to force Excel to treat it as plain text
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerRow = headers.map(sanitizeCsvField).join(',');
  const dataRows = rows.map((row) => row.map(sanitizeCsvField).join(','));
  return [headerRow, ...dataRows].join('\r\n');
}
