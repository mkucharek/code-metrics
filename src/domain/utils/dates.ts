/**
 * Date utility functions for consistent date parsing and handling
 */

/**
 * Parses an ISO date string (YYYY-MM-DD) as a local date
 * Avoids timezone issues by parsing components manually
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Date object set to local midnight (00:00:00.000)
 * @throws Error if date string is invalid
 *
 * @example
 * parseLocalDate('2025-01-01') // 2025-01-01 00:00:00 in local timezone
 */
export function parseLocalDate(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }

  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  // Validate components
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date components: ${dateStr}`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Expected 1-12`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Expected 1-31`);
  }

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Check if date is valid (e.g., not Feb 30)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date;
}

/**
 * Parses an ISO date string as a local date and sets time to end of day
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Date object set to local end of day (23:59:59.999)
 *
 * @example
 * parseLocalDateEndOfDay('2025-01-01') // 2025-01-01 23:59:59.999 in local timezone
 */
export function parseLocalDateEndOfDay(dateStr: string): Date {
  const date = parseLocalDate(dateStr);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Formats a date as ISO date string (YYYY-MM-DD) in local timezone
 *
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 *
 * @example
 * formatLocalDate(new Date(2025, 0, 1)) // '2025-01-01'
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets date N days ago at start of day (00:00:00.000)
 *
 * @param days - Number of days ago
 * @returns Date object N days ago at start of day
 *
 * @example
 * getDaysAgo(7) // 7 days ago at 00:00:00.000
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Gets current date at end of day (23:59:59.999)
 *
 * @returns Date object at end of current day
 *
 * @example
 * getEndOfToday() // Today at 23:59:59.999
 */
export function getEndOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}
