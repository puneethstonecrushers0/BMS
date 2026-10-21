/**
 * Asia/Kolkata is UTC+05:30.
 * These utilities ensure queries for date boundaries (e.g., today, specific day)
 * match the local business date boundaries accurately.
 */

const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;
const IST_OFFSET_MS = (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000;

export function getDayDateRangeInUtc(dateStr: string): { start: Date; end: Date } {
  // dateStr is 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number);

  // UTC midnight for the IST calendar day:
  // e.g. 2026-10-21 00:00:00 IST is 2026-10-20 18:30:00 UTC
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { start: startUtc, end: endUtc };
}

export function getDateRangeInUtc(startDateStr?: string, endDateStr?: string): { start?: Date; end?: Date } {
  const result: { start?: Date; end?: Date } = {};

  if (startDateStr) {
    const [year, month, day] = startDateStr.split('-').map(Number);
    result.start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
  }

  if (endDateStr) {
    const [year, month, day] = endDateStr.split('-').map(Number);
    result.end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);
  }

  return result;
}

export function formatInIst(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function getIstDateString(date: Date = new Date()): string {
  // Returns 'YYYY-MM-DD' in Asia/Kolkata
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
