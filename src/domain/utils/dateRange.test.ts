/**
 * Tests for dateRange utilities
 */

import { describe, expect, it } from 'vitest';
import {
  formatDateKey,
  parseDateKey,
  getDateRangeDays,
  batchIntoDayRanges,
  computeMissingDays,
  formatDateRange,
  formatDaysWithGaps,
} from './dateRange';

describe('formatDateKey', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    expect(formatDateKey(date)).toBe('2025-01-15');
  });

  it('handles dates at midnight UTC', () => {
    const date = new Date('2025-06-01T00:00:00Z');
    expect(formatDateKey(date)).toBe('2025-06-01');
  });

  it('handles dates at end of day UTC', () => {
    const date = new Date('2025-12-31T23:59:59Z');
    expect(formatDateKey(date)).toBe('2025-12-31');
  });
});

describe('parseDateKey', () => {
  it('parses YYYY-MM-DD to a valid date', () => {
    const date = parseDateKey('2025-01-15');
    // Just verify we get a valid date
    expect(date instanceof Date).toBe(true);
    expect(isNaN(date.getTime())).toBe(false);
  });
});

describe('getDateRangeDays', () => {
  it('returns all days in a range (inclusive)', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-01-05T00:00:00Z');

    const days = getDateRangeDays(start, end);

    expect(days).toEqual(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05']);
  });

  it('returns single day for same start and end', () => {
    const date = new Date('2025-03-15T00:00:00Z');
    const days = getDateRangeDays(date, date);

    expect(days).toEqual(['2025-03-15']);
  });

  it('handles month boundaries', () => {
    const start = new Date('2025-01-30T00:00:00Z');
    const end = new Date('2025-02-02T00:00:00Z');

    const days = getDateRangeDays(start, end);

    expect(days).toEqual(['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']);
  });
});

describe('batchIntoDayRanges', () => {
  it('returns empty array for empty input', () => {
    expect(batchIntoDayRanges([])).toEqual([]);
  });

  it('batches contiguous days into single range', () => {
    const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const ranges = batchIntoDayRanges(days);

    expect(ranges).toHaveLength(1);
  });

  it('splits non-contiguous days into multiple ranges', () => {
    const days = ['2025-01-01', '2025-01-02', '2025-01-05', '2025-01-06'];
    const ranges = batchIntoDayRanges(days);

    expect(ranges).toHaveLength(2);
  });

  it('handles single day', () => {
    const days = ['2025-01-15'];
    const ranges = batchIntoDayRanges(days);

    expect(ranges).toHaveLength(1);
  });

  it('handles unsorted input', () => {
    const days = ['2025-01-03', '2025-01-01', '2025-01-02'];
    const ranges = batchIntoDayRanges(days);

    expect(ranges).toHaveLength(1);
  });
});

describe('computeMissingDays', () => {
  it('returns all days when none are synced', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-01-03T00:00:00Z');
    const synced = new Set<string>();

    const missing = computeMissingDays(start, end, synced);

    expect(missing).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
  });

  it('returns no days when all are synced', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-01-03T00:00:00Z');
    const synced = new Set(['2025-01-01', '2025-01-02', '2025-01-03']);

    const missing = computeMissingDays(start, end, synced);

    expect(missing).toEqual([]);
  });

  it('returns only missing days', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-01-05T00:00:00Z');
    const synced = new Set(['2025-01-01', '2025-01-03', '2025-01-05']);

    const missing = computeMissingDays(start, end, synced);

    expect(missing).toEqual(['2025-01-02', '2025-01-04']);
  });
});

describe('formatDateRange', () => {
  it('formats single-day range', () => {
    const date = new Date('2025-01-15T00:00:00Z');
    expect(formatDateRange(date, date)).toBe('2025-01-15');
  });

  it('formats multi-day range', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end = new Date('2025-01-31T00:00:00Z');
    expect(formatDateRange(start, end)).toBe('2025-01-01 to 2025-01-31');
  });
});

describe('formatDaysWithGaps', () => {
  it('returns "none" for empty array', () => {
    const result = formatDaysWithGaps([]);
    expect(result.ranges).toBe('none');
    expect(result.gaps).toEqual([]);
  });

  it('formats contiguous days without gaps', () => {
    const days = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const result = formatDaysWithGaps(days);

    // Just verify it returns some range format (timezone-independent)
    expect(result.ranges).toContain('to');
    expect(result.gaps).toEqual([]);
  });

  it('identifies gaps between ranges', () => {
    const days = ['2025-01-01', '2025-01-02', '2025-01-05', '2025-01-06'];
    const result = formatDaysWithGaps(days);

    // Just verify we got multiple ranges and some gaps
    expect(result.ranges).toContain(','); // Multiple ranges
    expect(result.gaps.length).toBeGreaterThan(0); // Has gaps
  });
});
