import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseLocalDate,
  parseLocalDateEndOfDay,
  formatLocalDate,
  getDaysAgo,
  getEndOfToday,
} from './dates';

describe('Date Utilities', () => {
  describe('parseLocalDate', () => {
    it('should parse ISO date string as local midnight', () => {
      const date = parseLocalDate('2025-01-01');

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January = 0
      expect(date.getDate()).toBe(1);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('should handle different months correctly', () => {
      const dates = [
        { input: '2025-01-15', month: 0, day: 15 },
        { input: '2025-06-30', month: 5, day: 30 },
        { input: '2025-12-31', month: 11, day: 31 },
      ];

      dates.forEach(({ input, month, day }) => {
        const date = parseLocalDate(input);
        expect(date.getMonth()).toBe(month);
        expect(date.getDate()).toBe(day);
      });
    });

    it('should handle leap years correctly', () => {
      const date = parseLocalDate('2024-02-29');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29);
    });

    it('should throw error for invalid date format', () => {
      expect(() => parseLocalDate('2025/01/01')).toThrow('Invalid date format');
      expect(() => parseLocalDate('2025-1-1')).toThrow('Invalid date format');
      expect(() => parseLocalDate('01-01-2025')).toThrow('Invalid date format');
      expect(() => parseLocalDate('invalid')).toThrow('Invalid date format');
    });

    it('should throw error for invalid month', () => {
      expect(() => parseLocalDate('2025-00-01')).toThrow('Invalid month');
      expect(() => parseLocalDate('2025-13-01')).toThrow('Invalid month');
    });

    it('should throw error for invalid day', () => {
      expect(() => parseLocalDate('2025-01-00')).toThrow('Invalid day');
      expect(() => parseLocalDate('2025-01-32')).toThrow('Invalid day');
    });

    it('should throw error for non-existent dates', () => {
      expect(() => parseLocalDate('2025-02-30')).toThrow('Invalid date');
      expect(() => parseLocalDate('2025-02-29')).toThrow('Invalid date'); // 2025 is not a leap year
      expect(() => parseLocalDate('2025-04-31')).toThrow('Invalid date'); // April has 30 days
    });

    it('should not be affected by timezone (consistency test)', () => {
      // This test verifies that the same ISO date always produces the same local date
      // regardless of timezone, by checking that component values match
      const dateStr = '2025-01-01';
      const date = parseLocalDate(dateStr);

      // Format back to ISO and compare
      const formatted = formatLocalDate(date);
      expect(formatted).toBe(dateStr);
    });
  });

  describe('parseLocalDateEndOfDay', () => {
    it('should parse ISO date string as local end of day', () => {
      const date = parseLocalDateEndOfDay('2025-01-01');

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
    });

    it('should handle different dates correctly', () => {
      const dates = ['2025-01-15', '2025-06-30', '2025-12-31'];

      dates.forEach((dateStr) => {
        const date = parseLocalDateEndOfDay(dateStr);
        expect(date.getHours()).toBe(23);
        expect(date.getMinutes()).toBe(59);
        expect(date.getSeconds()).toBe(59);
        expect(date.getMilliseconds()).toBe(999);
      });
    });
  });

  describe('formatLocalDate', () => {
    it('should format date as ISO string (YYYY-MM-DD)', () => {
      const date = new Date(2025, 0, 1, 15, 30, 45); // Jan 1, 2025, 3:30:45 PM
      expect(formatLocalDate(date)).toBe('2025-01-01');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatLocalDate(date)).toBe('2025-01-05');
    });

    it('should handle different months correctly', () => {
      const dates = [
        { date: new Date(2025, 0, 15), expected: '2025-01-15' },
        { date: new Date(2025, 5, 30), expected: '2025-06-30' },
        { date: new Date(2025, 11, 31), expected: '2025-12-31' },
      ];

      dates.forEach(({ date, expected }) => {
        expect(formatLocalDate(date)).toBe(expected);
      });
    });
  });

  describe('getDaysAgo', () => {
    it('should return date N days ago at start of day', () => {
      const date = getDaysAgo(7);
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expected.setHours(0, 0, 0, 0);

      expect(date.getFullYear()).toBe(expected.getFullYear());
      expect(date.getMonth()).toBe(expected.getMonth());
      expect(date.getDate()).toBe(expected.getDate());
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('should handle 0 days ago (today at midnight)', () => {
      const date = getDaysAgo(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(date.getFullYear()).toBe(today.getFullYear());
      expect(date.getMonth()).toBe(today.getMonth());
      expect(date.getDate()).toBe(today.getDate());
    });

    it('should handle large day counts', () => {
      const date = getDaysAgo(365);
      const expected = new Date();
      expected.setDate(expected.getDate() - 365);

      expect(date.getFullYear()).toBe(expected.getFullYear());
    });
  });

  describe('getEndOfToday', () => {
    it('should return current date at end of day', () => {
      const date = getEndOfToday();
      const today = new Date();

      expect(date.getFullYear()).toBe(today.getFullYear());
      expect(date.getMonth()).toBe(today.getMonth());
      expect(date.getDate()).toBe(today.getDate());
      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
    });
  });

  describe('Round-trip consistency', () => {
    it('should parse and format consistently', () => {
      const dateStrings = [
        '2025-01-01',
        '2025-06-15',
        '2025-12-31',
        '2024-02-29', // Leap year
        '2025-02-28', // Non-leap year
      ];

      dateStrings.forEach((dateStr) => {
        const parsed = parseLocalDate(dateStr);
        const formatted = formatLocalDate(parsed);
        expect(formatted).toBe(dateStr);
      });
    });
  });

  describe('Timezone consistency (critical for CLI bug fix)', () => {
    let originalTZ: string | undefined;

    beforeEach(() => {
      originalTZ = process.env.TZ;
    });

    afterEach(() => {
      if (originalTZ) {
        process.env.TZ = originalTZ;
      } else {
        delete process.env.TZ;
      }
    });

    it('should produce consistent results across timezones', () => {
      const dateStr = '2025-01-01';
      const timezones = ['UTC', 'America/New_York', 'Europe/Warsaw', 'Asia/Tokyo'];

      const results: { tz: string; formatted: string }[] = [];

      timezones.forEach((tz) => {
        process.env.TZ = tz;

        const parsed = parseLocalDate(dateStr);
        const formatted = formatLocalDate(parsed);

        results.push({ tz, formatted });
      });

      // All timezones should produce the same formatted output
      const uniqueFormats = new Set(results.map((r) => r.formatted));
      expect(uniqueFormats.size).toBe(1);
      expect(uniqueFormats.has(dateStr)).toBe(true);
    });

    it('should not shift dates by one day in different timezones', () => {
      const dateStr = '2025-01-01';
      const timezones = ['UTC', 'America/Los_Angeles', 'Europe/Warsaw', 'Asia/Tokyo'];

      timezones.forEach((tz) => {
        process.env.TZ = tz;

        const parsed = parseLocalDate(dateStr);

        // Should always be Jan 1, 2025 regardless of timezone
        expect(parsed.getFullYear()).toBe(2025);
        expect(parsed.getMonth()).toBe(0);
        expect(parsed.getDate()).toBe(1);
      });
    });

    it('should handle end of day consistently across timezones', () => {
      const dateStr = '2025-01-01';
      const timezones = ['UTC', 'America/New_York', 'Europe/Warsaw', 'Asia/Tokyo'];

      timezones.forEach((tz) => {
        process.env.TZ = tz;

        const parsed = parseLocalDateEndOfDay(dateStr);

        // Should always be Jan 1, 2025 23:59:59.999 regardless of timezone
        expect(parsed.getFullYear()).toBe(2025);
        expect(parsed.getMonth()).toBe(0);
        expect(parsed.getDate()).toBe(1);
        expect(parsed.getHours()).toBe(23);
        expect(parsed.getMinutes()).toBe(59);
        expect(parsed.getSeconds()).toBe(59);
        expect(parsed.getMilliseconds()).toBe(999);
      });
    });
  });
});
