import { describe, it, expect } from 'vitest';
import {
  computeEngineerMetrics,
  getUniqueEngineers,
  filterPRsByDateRange,
} from './engineer-metrics';
import type { PullRequest, Review, Comment, DateRange } from '../models';

describe('Engineer Metrics', () => {
  const dateRange: DateRange = {
    start: new Date('2025-09-01'),
    end: new Date('2025-09-30'),
  };

  const mockPRs: PullRequest[] = [
    {
      id: 1,
      number: 101,
      repository: 'org/repo1',
      author: 'alice',
      title: 'Add feature A',
      body: '',
      state: 'merged',
      mergedBy: null,
      headBranch: 'feature',
      baseBranch: 'main',
      createdAt: new Date('2025-09-15'),
      updatedAt: new Date('2025-09-16'),
      mergedAt: new Date('2025-09-16'),
      closedAt: new Date('2025-09-16'),
      additions: 100,
      deletions: 20,
      changedFiles: 3,
      commentCount: 5,
      reviewCommentCount: 2,
      commitCount: 4,
      labels: ['feature'],
      isDraft: false,
      requestedReviewers: [],
    },
    {
      id: 2,
      number: 102,
      repository: 'org/repo1',
      author: 'alice',
      title: 'Fix bug B',
      body: '',
      state: 'merged',
      mergedBy: null,
      headBranch: 'feature',
      baseBranch: 'main',
      createdAt: new Date('2025-09-20'),
      updatedAt: new Date('2025-09-21'),
      mergedAt: new Date('2025-09-21'),
      closedAt: new Date('2025-09-21'),
      additions: 50,
      deletions: 30,
      changedFiles: 2,
      commentCount: 3,
      reviewCommentCount: 1,
      commitCount: 2,
      labels: ['bugfix'],
      isDraft: false,
      requestedReviewers: [],
    },
    {
      id: 3,
      number: 103,
      repository: 'org/repo2',
      author: 'bob',
      title: 'Update docs',
      body: '',
      state: 'open',
      mergedBy: null,
      headBranch: 'feature',
      baseBranch: 'main',
      createdAt: new Date('2025-09-25'),
      updatedAt: new Date('2025-09-25'),
      mergedAt: null,
      closedAt: null,
      additions: 10,
      deletions: 5,
      changedFiles: 1,
      commentCount: 1,
      reviewCommentCount: 0,
      commitCount: 1,
      labels: ['docs'],
      isDraft: false,
      requestedReviewers: [],
    },
  ];

  const mockReviews: Review[] = [
    {
      id: 1,
      pullRequestId: 3,
      repository: 'org/repo2',
      reviewer: 'alice',
      state: 'APPROVED',
      submittedAt: new Date('2025-09-26'),
      body: 'LGTM',
      commentCount: 0,
    },
    {
      id: 2,
      pullRequestId: 1,
      repository: 'org/repo1',
      reviewer: 'bob',
      state: 'APPROVED',
      submittedAt: new Date('2025-09-16'),
      body: 'Looks good',
      commentCount: 1,
    },
  ];

  const mockComments: Comment[] = [
    {
      id: 1,
      pullRequestId: 1,
      repository: 'org/repo1',
      author: 'alice',
      body: 'Fixed the issue',
      createdAt: new Date('2025-09-15'),
      updatedAt: new Date('2025-09-15'),
      type: 'issue_comment',
      reviewId: null,
      path: null,
      line: null,
    },
    {
      id: 2,
      pullRequestId: 2,
      repository: 'org/repo1',
      author: 'bob',
      body: 'Please update the tests',
      createdAt: new Date('2025-09-20'),
      updatedAt: new Date('2025-09-20'),
      type: 'review_comment',
      reviewId: 2,
      path: 'src/test.ts',
      line: 42,
    },
  ];

  describe('computeEngineerMetrics', () => {
    it('computes metrics correctly for Alice', () => {
      const metrics = computeEngineerMetrics(
        'alice',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );

      expect(metrics.engineer).toBe('alice');
      expect(metrics.prsCreated).toBe(2);
      expect(metrics.reviewsGiven).toBe(1);
      expect(metrics.linesAdded).toBe(150);
      expect(metrics.linesDeleted).toBe(50);
      expect(metrics.netLines).toBe(100);
      expect(metrics.totalLinesChanged).toBe(200);
      expect(metrics.commentsCreated).toBe(1);
      expect(metrics.prsMerged).toBe(2);
      expect(metrics.mergeRate).toBe(1);
      expect(metrics.avgPRSize).toBe(100);
      expect(metrics.repositories).toEqual(['org/repo1']);
    });

    it('computes metrics correctly for Bob', () => {
      const metrics = computeEngineerMetrics('bob', mockPRs, mockReviews, mockComments, dateRange);

      expect(metrics.engineer).toBe('bob');
      expect(metrics.prsCreated).toBe(1);
      expect(metrics.reviewsGiven).toBe(1);
      expect(metrics.linesAdded).toBe(10);
      expect(metrics.linesDeleted).toBe(5);
      expect(metrics.commentsCreated).toBe(1);
      expect(metrics.prsMerged).toBe(0);
      expect(metrics.mergeRate).toBe(0);
      expect(metrics.repositories).toEqual(['org/repo2']);
    });

    it('returns zero metrics for engineer with no activity', () => {
      const metrics = computeEngineerMetrics(
        'charlie',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );

      expect(metrics.engineer).toBe('charlie');
      expect(metrics.prsCreated).toBe(0);
      expect(metrics.reviewsGiven).toBe(0);
      expect(metrics.linesAdded).toBe(0);
      expect(metrics.linesDeleted).toBe(0);
      expect(metrics.commentsCreated).toBe(0);
      expect(metrics.avgPRSize).toBe(0);
      expect(metrics.mergeRate).toBe(0);
      expect(metrics.repositories).toEqual([]);
    });
  });

  describe('getUniqueEngineers', () => {
    it('extracts unique engineers from all sources', () => {
      const engineers = getUniqueEngineers(mockPRs, mockReviews, mockComments);
      expect(engineers).toEqual(['alice', 'bob']);
    });

    it('returns empty array when no data', () => {
      const engineers = getUniqueEngineers([], [], []);
      expect(engineers).toEqual([]);
    });
  });

  describe('filterPRsByDateRange', () => {
    it('filters PRs within date range', () => {
      const filtered = filterPRsByDateRange(mockPRs, dateRange);
      expect(filtered).toHaveLength(3);
    });

    it('excludes PRs outside date range', () => {
      const narrowRange: DateRange = {
        start: new Date('2025-09-14'),
        end: new Date('2025-09-19'),
      };
      const filtered = filterPRsByDateRange(mockPRs, narrowRange);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.author).toBe('alice');
    });
  });
});
