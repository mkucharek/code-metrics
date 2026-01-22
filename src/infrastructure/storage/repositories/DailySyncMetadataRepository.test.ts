import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DailySyncMetadataRepository } from './DailySyncMetadataRepository';
import type { DailySyncMetadataInput } from './DailySyncMetadataRepository';

describe('DailySyncMetadataRepository', () => {
  let db: Database.Database;
  let repo: DailySyncMetadataRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    // Create table directly for testing
    db.exec(`
      CREATE TABLE daily_sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_type TEXT NOT NULL CHECK(resource_type IN ('pull_requests', 'reviews', 'comments', 'commits')),
        organization TEXT NOT NULL,
        repository TEXT NOT NULL,
        sync_date TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        items_synced INTEGER NOT NULL DEFAULT 0,
        UNIQUE(resource_type, organization, repository, sync_date)
      );
      CREATE INDEX idx_daily_sync_lookup
        ON daily_sync_metadata(resource_type, organization, repository, sync_date);
    `);
    repo = new DailySyncMetadataRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  const mockRecord: DailySyncMetadataInput = {
    resourceType: 'pull_requests',
    organization: 'test-org',
    repository: 'test-repo',
    syncDate: '2025-01-15',
    syncedAt: new Date('2025-01-15T10:00:00Z'),
    itemsSynced: 5,
  };

  describe('save', () => {
    it('inserts a new record', () => {
      repo.save(mockRecord);

      const result = repo.getDay('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(result).not.toBeNull();
      expect(result?.syncDate).toBe('2025-01-15');
      expect(result?.itemsSynced).toBe(5);
    });

    it('updates existing record on conflict (upsert)', () => {
      repo.save(mockRecord);
      repo.save({ ...mockRecord, itemsSynced: 10 });

      const result = repo.getDay('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(result?.itemsSynced).toBe(10);

      // Should only have one record
      const allDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(allDays).toHaveLength(1);
    });
  });

  describe('saveBatch', () => {
    it('saves multiple records in a transaction', () => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-01-16' },
        { ...mockRecord, syncDate: '2025-01-17' },
      ];

      repo.saveBatch(records);

      const syncedDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(syncedDays).toEqual(['2025-01-15', '2025-01-16', '2025-01-17']);
    });

    it('handles empty batch', () => {
      expect(() => repo.saveBatch([])).not.toThrow();
    });

    it('updates existing records in batch (upsert)', () => {
      repo.save({ ...mockRecord, syncDate: '2025-01-15', itemsSynced: 5 });

      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-15', itemsSynced: 10 },
        { ...mockRecord, syncDate: '2025-01-16', itemsSynced: 20 },
      ];
      repo.saveBatch(records);

      const day15 = repo.getDay('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(day15?.itemsSynced).toBe(10);

      const syncedDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(syncedDays).toHaveLength(2);
    });
  });

  describe('getSyncedDays', () => {
    beforeEach(() => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-10' },
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-01-20' },
        { ...mockRecord, syncDate: '2025-01-25' },
      ];
      repo.saveBatch(records);
    });

    it('returns days within date range (inclusive boundaries)', () => {
      const days = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-15',
        '2025-01-20'
      );
      expect(days).toEqual(['2025-01-15', '2025-01-20']);
    });

    it('returns empty array when no days in range', () => {
      const days = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-02-01',
        '2025-02-28'
      );
      expect(days).toEqual([]);
    });

    it('returns all matching days for wide range', () => {
      const days = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(days).toEqual(['2025-01-10', '2025-01-15', '2025-01-20', '2025-01-25']);
    });

    it('filters by resource type', () => {
      repo.save({ ...mockRecord, resourceType: 'reviews', syncDate: '2025-01-15' });

      const prDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      const reviewDays = repo.getSyncedDays(
        'reviews',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );

      expect(prDays).toHaveLength(4);
      expect(reviewDays).toHaveLength(1);
    });

    it('filters by repository', () => {
      repo.save({ ...mockRecord, repository: 'other-repo', syncDate: '2025-01-15' });

      const testRepoDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      const otherRepoDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'other-repo',
        '2025-01-01',
        '2025-01-31'
      );

      expect(testRepoDays).toHaveLength(4);
      expect(otherRepoDays).toHaveLength(1);
    });
  });

  describe('isDaySynced', () => {
    it('returns true for synced day', () => {
      repo.save(mockRecord);

      const result = repo.isDaySynced('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(result).toBe(true);
    });

    it('returns false for unsynced day', () => {
      repo.save(mockRecord);

      const result = repo.isDaySynced('pull_requests', 'test-org', 'test-repo', '2025-01-16');
      expect(result).toBe(false);
    });

    it('returns false for different resource type', () => {
      repo.save(mockRecord);

      const result = repo.isDaySynced('reviews', 'test-org', 'test-repo', '2025-01-15');
      expect(result).toBe(false);
    });
  });

  describe('getDay', () => {
    it('returns sync metadata for specific day', () => {
      repo.save(mockRecord);

      const result = repo.getDay('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(result).not.toBeNull();
      expect(result?.syncDate).toBe('2025-01-15');
      expect(result?.organization).toBe('test-org');
      expect(result?.repository).toBe('test-repo');
      expect(result?.resourceType).toBe('pull_requests');
    });

    it('returns null for unsynced day', () => {
      const result = repo.getDay('pull_requests', 'test-org', 'test-repo', '2025-01-15');
      expect(result).toBeNull();
    });
  });

  describe('deleteRange', () => {
    beforeEach(() => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-10' },
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-01-20' },
        { ...mockRecord, syncDate: '2025-01-25' },
      ];
      repo.saveBatch(records);
    });

    it('deletes days within range', () => {
      const deleted = repo.deleteRange(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-15',
        '2025-01-20'
      );

      expect(deleted).toBe(2);

      const remaining = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(remaining).toEqual(['2025-01-10', '2025-01-25']);
    });

    it('returns 0 when no days in range', () => {
      const deleted = repo.deleteRange(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-02-01',
        '2025-02-28'
      );
      expect(deleted).toBe(0);
    });

    it('only deletes matching resource type', () => {
      repo.save({ ...mockRecord, resourceType: 'reviews', syncDate: '2025-01-15' });

      const deleted = repo.deleteRange(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );

      expect(deleted).toBe(4);
      const reviewDays = repo.getSyncedDays(
        'reviews',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(reviewDays).toHaveLength(1);
    });
  });

  describe('deleteByRepository', () => {
    it('deletes all days for a repository', () => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-10' },
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-01-20' },
      ];
      repo.saveBatch(records);

      const deleted = repo.deleteByRepository('pull_requests', 'test-org', 'test-repo');

      expect(deleted).toBe(3);

      const remaining = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'test-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(remaining).toEqual([]);
    });

    it('only deletes for specified repository', () => {
      repo.save({ ...mockRecord, repository: 'other-repo', syncDate: '2025-01-15' });
      repo.save({ ...mockRecord, repository: 'test-repo', syncDate: '2025-01-15' });

      repo.deleteByRepository('pull_requests', 'test-org', 'test-repo');

      const otherRepoDays = repo.getSyncedDays(
        'pull_requests',
        'test-org',
        'other-repo',
        '2025-01-01',
        '2025-01-31'
      );
      expect(otherRepoDays).toHaveLength(1);
    });
  });

  describe('getDateRangeCoverage', () => {
    it('returns min/max dates and count', () => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2025-01-10' },
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-01-20' },
      ];
      repo.saveBatch(records);

      const coverage = repo.getDateRangeCoverage('pull_requests', 'test-org', 'test-repo');

      expect(coverage).not.toBeNull();
      expect(coverage?.minDate).toBe('2025-01-10');
      expect(coverage?.maxDate).toBe('2025-01-20');
      expect(coverage?.dayCount).toBe(3);
    });

    it('returns null for empty repository', () => {
      const coverage = repo.getDateRangeCoverage('pull_requests', 'test-org', 'test-repo');
      expect(coverage).toBeNull();
    });
  });

  describe('getSyncSummary', () => {
    it('returns summary grouped by repository and resource type', () => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, repository: 'repo-a', syncDate: '2025-01-10', itemsSynced: 5 },
        { ...mockRecord, repository: 'repo-a', syncDate: '2025-01-11', itemsSynced: 10 },
        { ...mockRecord, repository: 'repo-b', syncDate: '2025-01-10', itemsSynced: 3 },
        {
          ...mockRecord,
          repository: 'repo-a',
          resourceType: 'reviews',
          syncDate: '2025-01-10',
          itemsSynced: 2,
        },
      ];
      repo.saveBatch(records);

      const summary = repo.getSyncSummary('test-org');

      expect(summary).toHaveLength(3);

      const repoAPRs = summary.find(
        (s) => s.repository === 'repo-a' && s.resourceType === 'pull_requests'
      );
      expect(repoAPRs?.dayCount).toBe(2);
      expect(repoAPRs?.totalItems).toBe(15);

      const repoBPRs = summary.find(
        (s) => s.repository === 'repo-b' && s.resourceType === 'pull_requests'
      );
      expect(repoBPRs?.dayCount).toBe(1);
      expect(repoBPRs?.totalItems).toBe(3);

      const repoAReviews = summary.find(
        (s) => s.repository === 'repo-a' && s.resourceType === 'reviews'
      );
      expect(repoAReviews?.dayCount).toBe(1);
      expect(repoAReviews?.totalItems).toBe(2);
    });

    it('returns empty array for organization with no data', () => {
      const summary = repo.getSyncSummary('unknown-org');
      expect(summary).toEqual([]);
    });
  });

  describe('getAllSyncedDays', () => {
    it('returns all synced days without date range filter', () => {
      const records: DailySyncMetadataInput[] = [
        { ...mockRecord, syncDate: '2024-06-15' },
        { ...mockRecord, syncDate: '2025-01-15' },
        { ...mockRecord, syncDate: '2025-12-15' },
      ];
      repo.saveBatch(records);

      const days = repo.getAllSyncedDays('pull_requests', 'test-org', 'test-repo');
      expect(days).toEqual(['2024-06-15', '2025-01-15', '2025-12-15']);
    });
  });
});
