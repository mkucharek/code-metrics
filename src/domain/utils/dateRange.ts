/**
 * Date range utilities for per-day sync tracking
 * All dates are handled in UTC for consistency with GitHub API
 */

import { eachDayOfInterval, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

/**
 * Format a date as YYYY-MM-DD in UTC
 */
export function formatDateKey(date: Date): string {
  return format(new UTCDate(date), 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD string to a UTC Date at start of day
 */
export function parseDateKey(dateKey: string): Date {
  return startOfDay(new UTCDate(parseISO(dateKey)));
}

/**
 * Get all days in a date range as YYYY-MM-DD strings
 * Both start and end dates are inclusive
 */
export function getDateRangeDays(startDate: Date, endDate: Date): string[] {
  const utcStart = startOfDay(new UTCDate(startDate));
  const utcEnd = startOfDay(new UTCDate(endDate));

  const days = eachDayOfInterval({ start: utcStart, end: utcEnd });
  return days.map((day) => format(day, 'yyyy-MM-dd'));
}

// Import and re-export DateRange from models to avoid duplication
import type { DateRange } from '../models/DateRange';
export type { DateRange };

/**
 * Batch an array of date keys into contiguous ranges
 * Useful for optimizing API calls by fetching contiguous ranges together
 *
 * @example
 * batchIntoDayRanges(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-05', '2025-01-06'])
 * // Returns: [{ start: Jan1, end: Jan3 }, { start: Jan5, end: Jan6 }]
 */
export function batchIntoDayRanges(dateKeys: string[]): DateRange[] {
  if (dateKeys.length === 0) return [];

  // Sort dates
  const sorted = [...dateKeys].sort();
  const ranges: DateRange[] = [];

  const firstDay = sorted[0];
  if (!firstDay) return [];

  let rangeStart = parseDateKey(firstDay);
  let rangeEnd = endOfDay(new UTCDate(rangeStart));

  for (let i = 1; i < sorted.length; i++) {
    const currentKey = sorted[i];
    const prevKey = sorted[i - 1];
    if (!currentKey || !prevKey) continue;

    const current = parseDateKey(currentKey);
    const prevDate = parseDateKey(prevKey);

    // Check if current day is consecutive (within ~36 hours to handle timezone edge cases)
    const msPerDay = 24 * 60 * 60 * 1000;
    const dayDiff = (current.getTime() - prevDate.getTime()) / msPerDay;

    if (dayDiff <= 1.5) {
      // Extend current range
      rangeEnd = endOfDay(new UTCDate(current));
    } else {
      // Save current range and start new one
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = current;
      rangeEnd = endOfDay(new UTCDate(current));
    }
  }

  // Don't forget the last range
  ranges.push({ start: rangeStart, end: rangeEnd });

  return ranges;
}

/**
 * Compute which days need syncing based on already-synced days
 */
export function computeMissingDays(
  startDate: Date,
  endDate: Date,
  syncedDays: Set<string>
): string[] {
  const allDays = getDateRangeDays(startDate, endDate);
  return allDays.filter((day) => !syncedDays.has(day));
}

/**
 * Format a date range as a human-readable string
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = formatDateKey(start);
  const endStr = formatDateKey(end);
  return startStr === endStr ? startStr : `${startStr} to ${endStr}`;
}

/**
 * Consolidate an array of date keys into human-readable ranges with gaps
 *
 * @example
 * formatDaysWithGaps(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-05', '2025-01-06'])
 * // Returns: "2025-01-01 to 2025-01-03, 2025-01-05 to 2025-01-06 (gap: 2025-01-04)"
 */
export function formatDaysWithGaps(dateKeys: string[]): {
  ranges: string;
  gaps: string[];
} {
  if (dateKeys.length === 0) {
    return { ranges: 'none', gaps: [] };
  }

  const ranges = batchIntoDayRanges(dateKeys);
  const rangeStrs = ranges.map((r) => formatDateRange(r.start, r.end));

  // Find gaps between ranges
  const gaps: string[] = [];
  for (let i = 1; i < ranges.length; i++) {
    const prevRange = ranges[i - 1];
    const currRange = ranges[i];
    if (!prevRange || !currRange) continue;

    const gapDays = getDateRangeDays(prevRange.end, currRange.start).slice(1, -1); // Exclude boundaries
    gaps.push(...gapDays);
  }

  return {
    ranges: rangeStrs.join(', '),
    gaps,
  };
}
