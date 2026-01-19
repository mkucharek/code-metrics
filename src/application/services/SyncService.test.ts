/**
 * Sync Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncService } from './SyncService';
import type { AppConfig } from '../../infrastructure/config/schema';

describe('SyncService', () => {
  let service: SyncService;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      nodeEnv: 'test',
      github: {
        token: 'test-token',
        organization: 'test-org',
        rateLimit: { maxRetries: 3, backoffMs: 1000 },
      },
      database: {
        path: ':memory:',
        verbose: false,
        walMode: false,
      },
      logging: {
        level: 'info',
        colored: false,
      },
      reports: {
        defaultDateRange: 'last-30-days',
        outputDirectory: './reports',
        excludedUsers: [],
      },
      teams: {},
    };

    service = new SyncService({ config: mockConfig });
  });

  afterEach(() => {
    service.close();
  });

  describe('parseDateRange', () => {
    it('should parse days ago format', () => {
      const result = service.parseDateRange({ since: '30' });

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);

      // Start date should be approximately 30 days ago
      const expectedDaysAgo = 30;
      const actualDaysAgo = Math.round(
        (result.endDate.getTime() - result.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(actualDaysAgo).toBeGreaterThanOrEqual(expectedDaysAgo - 1);
      expect(actualDaysAgo).toBeLessThanOrEqual(expectedDaysAgo + 1);
    });

    it('should parse ISO date format', () => {
      const result = service.parseDateRange({
        since: '2024-01-01',
        until: '2024-01-31',
      });

      // Check dates using local date string to avoid timezone issues
      const startDateLocal = result.startDate.toISOString().split('T')[0];
      const endDateLocal = result.endDate.toISOString().split('T')[0];

      // Start should be 2024-01-01 or 2023-12-31 (depending on timezone)
      expect(['2024-01-01', '2023-12-31']).toContain(startDateLocal);
      // End should be 2024-01-31 or 2024-02-01 (depending on timezone)
      expect(['2024-01-31', '2024-02-01']).toContain(endDateLocal);
    });

    it('should use end of today when until is not provided', () => {
      const result = service.parseDateRange({ since: '2024-01-01' });

      const startDateLocal = result.startDate.toISOString().split('T')[0];
      expect(['2024-01-01', '2023-12-31']).toContain(startDateLocal);

      // End date should be today (check year, month, date directly)
      const today = new Date();
      const resultLocal = new Date(result.endDate.toISOString().split('T')[0]!);
      const todayLocal = new Date(today.toISOString().split('T')[0]!);

      expect(resultLocal.getTime()).toBeLessThanOrEqual(todayLocal.getTime() + 86400000); // Within 1 day
      expect(resultLocal.getTime()).toBeGreaterThanOrEqual(todayLocal.getTime() - 86400000);
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        service.parseDateRange({ since: 'invalid-date' });
      }).toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return database statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('pullRequests');
      expect(stats).toHaveProperty('reviews');
      expect(stats).toHaveProperty('comments');
      expect(typeof stats.pullRequests).toBe('number');
      expect(typeof stats.reviews).toBe('number');
      expect(typeof stats.comments).toBe('number');
    });

    it('should return zero counts for empty database', () => {
      const stats = service.getStatistics();

      expect(stats.pullRequests).toBe(0);
      expect(stats.reviews).toBe(0);
      expect(stats.comments).toBe(0);
    });
  });

  describe('getSyncedRepositories', () => {
    it('should return list of synced repositories', () => {
      const repos = service.getSyncedRepositories();

      expect(Array.isArray(repos)).toBe(true);
    });

    it('should return empty array for new database', () => {
      const repos = service.getSyncedRepositories();

      expect(repos).toEqual([]);
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      // Initialize database by calling a method
      service.getStatistics();

      // Should not throw
      expect(() => service.close()).not.toThrow();
    });

    it('should allow multiple close calls', () => {
      service.close();
      expect(() => service.close()).not.toThrow();
    });
  });
});
