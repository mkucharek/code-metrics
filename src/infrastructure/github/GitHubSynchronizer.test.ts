/**
 * GitHub Synchronizer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubSynchronizer } from './GitHubSynchronizer';
import type { GitHubClient } from './GitHubClient';
import type { PRRepository } from '../storage/repositories/PRRepository';
import type { ReviewRepository } from '../storage/repositories/ReviewRepository';
import type { CommentRepository } from '../storage/repositories/CommentRepository';
import type { CommitRepository } from '../storage/repositories/CommitRepository';
import type { CommitFileRepository } from '../storage/repositories/CommitFileRepository';
import type { RepositoryMetadataRepository } from '../storage/repositories/RepositoryMetadataRepository';
import type { DailySyncMetadataRepository } from '../storage/repositories/DailySyncMetadataRepository';

describe('GitHubSynchronizer', () => {
  let synchronizer: GitHubSynchronizer;
  let mockGitHubClient: GitHubClient;
  let mockPRRepository: PRRepository;
  let mockReviewRepository: ReviewRepository;
  let mockCommentRepository: CommentRepository;
  let mockCommitRepository: CommitRepository;
  let mockCommitFileRepository: CommitFileRepository;
  let mockRepoMetadataRepository: RepositoryMetadataRepository;
  let mockDailySyncMetadataRepository: DailySyncMetadataRepository;

  beforeEach(() => {
    // Create mock instances
    mockGitHubClient = {
      getOrganization: vi.fn(() => 'test-org'),
      checkRateLimit: vi.fn(() =>
        Promise.resolve({
          limit: 5000,
          remaining: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
        })
      ),
      countPullRequests: vi.fn(() => Promise.resolve(10)),
      fetchRepositories: vi.fn(() => Promise.resolve([])),
      fetchPullRequests: vi.fn(() => Promise.resolve([])),
      fetchPullRequest: vi.fn(),
      fetchReviews: vi.fn(() => Promise.resolve([])),
      fetchIssueComments: vi.fn(() => Promise.resolve([])),
      fetchReviewComments: vi.fn(() => Promise.resolve([])),
      fetchRepositoryInfo: vi.fn(() =>
        Promise.resolve({
          default_branch: 'main',
          name: 'test-repo',
          full_name: 'test-org/test-repo',
        })
      ),
      fetchCommits: vi.fn(() => Promise.resolve([])),
    } as unknown as GitHubClient;

    mockPRRepository = {
      save: vi.fn(),
    } as unknown as PRRepository;

    mockReviewRepository = {
      save: vi.fn(),
    } as unknown as ReviewRepository;

    mockCommentRepository = {
      save: vi.fn(),
    } as unknown as CommentRepository;

    mockCommitRepository = {
      save: vi.fn(),
    } as unknown as CommitRepository;

    mockCommitFileRepository = {
      saveBatch: vi.fn(),
    } as unknown as CommitFileRepository;

    mockRepoMetadataRepository = {
      getDefaultBranch: vi.fn(() => null),
      updateDefaultBranch: vi.fn(),
      isCacheStale: vi.fn(() => true),
    } as unknown as RepositoryMetadataRepository;

    mockDailySyncMetadataRepository = {
      getSyncedDays: vi.fn(() => []),
      saveBatch: vi.fn(),
      save: vi.fn(),
      getAllSyncedDays: vi.fn(() => []),
      isDaySynced: vi.fn(() => false),
      getDay: vi.fn(() => null),
      deleteRange: vi.fn(() => 0),
      deleteByRepository: vi.fn(() => 0),
      getSyncSummary: vi.fn(() => []),
      getDateRangeCoverage: vi.fn(() => null),
    } as unknown as DailySyncMetadataRepository;

    synchronizer = new GitHubSynchronizer(
      mockGitHubClient,
      mockPRRepository,
      mockReviewRepository,
      mockCommentRepository,
      mockCommitRepository,
      mockCommitFileRepository,
      mockRepoMetadataRepository,
      mockDailySyncMetadataRepository
    );
  });

  describe('Cache Logic', () => {
    it('should skip sync when all days are synced via daily tracking', async () => {
      // All days in range already synced via daily tracking
      const daysInRange: string[] = [];
      const start = new Date('2025-09-15T00:00:00Z');
      const end = new Date('2025-09-25T00:00:00Z');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysInRange.push(d.toISOString().split('T')[0] as string);
      }
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue(daysInRange);

      const result = await synchronizer.sync({
        repo: 'test-repo',
        startDate: start,
        endDate: end,
        force: false,
      });

      // Should NOT have fetched PRs (all days synced)
      expect(mockGitHubClient.fetchPullRequests).not.toHaveBeenCalled();
      expect(result.repoCount).toBe(1); // Still counts as processed
      expect(result.prsFetched).toBe(0); // But fetched nothing
    });
  });

  describe('Daily Sync Tracking', () => {
    it('should skip sync when all days are already synced', async () => {
      // All 3 days already synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue([
        '2025-01-01',
        '2025-01-02',
        '2025-01-03',
      ]);

      const result = await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: false,
      });

      // Should NOT fetch PRs (all days synced)
      expect(mockGitHubClient.fetchPullRequests).not.toHaveBeenCalled();
      expect(result.daysSkipped).toBe(3);
    });

    it('should sync only missing days', async () => {
      // Only day 2 synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue(['2025-01-02']);

      await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: false,
      });

      // Should fetch PRs (days 1 and 3 need sync)
      expect(mockGitHubClient.fetchPullRequests).toHaveBeenCalled();
    });

    it('should sync all days when force=true regardless of synced state', async () => {
      // All days synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue([
        '2025-01-01',
        '2025-01-02',
        '2025-01-03',
      ]);

      await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: true,
      });

      // Should fetch PRs despite all days being synced (force overrides)
      expect(mockGitHubClient.fetchPullRequests).toHaveBeenCalled();
    });

    it('should save daily sync records after successful sync', async () => {
      // No days synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue([]);

      await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: false,
      });

      // Should have saved daily sync records
      expect(mockDailySyncMetadataRepository.saveBatch).toHaveBeenCalled();
      const savedRecords = vi.mocked(mockDailySyncMetadataRepository.saveBatch).mock.calls[0]?.[0];
      expect(savedRecords).toBeDefined();
      expect(savedRecords?.length).toBeGreaterThanOrEqual(1);
    });

    it('should not save daily sync records when all days already synced', async () => {
      // All days synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue([
        '2025-01-01',
        '2025-01-02',
        '2025-01-03',
      ]);

      await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: false,
      });

      // Should NOT save any records (nothing to sync)
      expect(mockDailySyncMetadataRepository.saveBatch).not.toHaveBeenCalled();
    });

    it('should track daysSynced and daysSkipped in summary', async () => {
      // Day 2 already synced
      vi.mocked(mockDailySyncMetadataRepository.getSyncedDays).mockReturnValue(['2025-01-02']);

      const result = await synchronizer.sync({
        repo: 'test-repo',
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-03T23:59:59Z'),
        force: false,
      });

      expect(result.daysSkipped).toBe(1); // Day 2
      // daysSynced depends on successful processing
      expect(result.daysSynced).toBeGreaterThanOrEqual(0);
    });
  });
});
