/**
 * Date Range Model
 * Represents a time period for filtering data
 */

export interface DateRange {
  /** Start date of the range (inclusive) */
  start: Date;

  /** End date of the range (inclusive) */
  end: Date;
}

/**
 * Type guard to check if an object is a DateRange
 */
export function isDateRange(obj: unknown): obj is DateRange {
  if (typeof obj !== 'object' || obj === null) return false;

  const range = obj as Partial<DateRange>;

  return range.start instanceof Date && range.end instanceof Date && range.start <= range.end;
}

/**
 * Check if a date falls within a date range
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

/**
 * Create a date range for the last N days
 */
export function createLastNDaysRange(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return { start, end };
}

/**
 * Create a date range for the current month
 */
export function createCurrentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return { start, end };
}

/**
 * Create a date range for a specific month
 */
export function createMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return { start, end };
}
