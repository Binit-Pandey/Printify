/**
 * Date helpers that work in the user's local timezone.
 *
 * `toISOString()` converts to UTC first, so in any timezone east of Greenwich
 * (Nepal is UTC+05:45) the "current day" flips an hour or more before local
 * midnight. Anything that buckets records by day — today's sales, this month's
 * expenses, a 7-day chart — would silently count the wrong day. These helpers
 * build the YYYY-MM-DD key from local getFullYear/getMonth/getDate instead.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar day as YYYY-MM-DD (never UTC-shifted). */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local calendar month as YYYY-MM. */
export function localMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Local month key for the month `offset` months away from `date`. */
export function monthKeyOffset(offset: number, date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return localMonthKey(d);
}

/** Local day key `days` before `date` (negative looks further back). */
export function dayKeyOffset(days: number, date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return localDateKey(d);
}
