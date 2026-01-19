import { describe, it, expect } from 'vitest';
import {
  computeOrganizationMetrics,
  computeSummaryStatistics,
  rankEngineersByMetric,
} from './organization-metrics';
import type { PullRequest, Review, Comment, DateRange } from '../models';

describe('Organization Metrics', () => {
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
      repository: 'org/repo2',
      author: 'bob',
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
  ];

  const mockReviews: Review[] = [
    {
      id: 1,
      pullRequestId: 2,
      repository: 'org/repo2',
      reviewer: 'alice',
      state: 'APPROVED',
      submittedAt: new Date('2025-09-21'),
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
  ];

  describe('computeOrganizationMetrics', () => {
    it('computes organization-wide metrics correctly', () => {
      const metrics = computeOrganizationMetrics(
        'acme',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );

      expect(metrics.organization).toBe('acme');
      expect(metrics.engineerCount).toBe(2);
      expect(metrics.totalPRsCreated).toBe(2);
      expect(metrics.totalReviewsGiven).toBe(2);
      expect(metrics.totalLinesAdded).toBe(150);
      expect(metrics.totalLinesDeleted).toBe(50);
      expect(metrics.totalCommentsCreated).toBe(1);
      expect(metrics.totalPRsMerged).toBe(2);
      expect(metrics.mergeRate).toBe(1);
      expect(metrics.avgPRSize).toBe(100);
      expect(metrics.repositories).toEqual(['org/repo1', 'org/repo2']);
    });

    it('includes engineer-level metrics', () => {
      const metrics = computeOrganizationMetrics(
        'acme',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );

      expect(metrics.engineers).toHaveLength(2);

      const alice = metrics.engineers.find((e) => e.engineer === 'alice');
      expect(alice).toBeDefined();
      expect(alice?.prsCreated).toBe(1);
      expect(alice?.reviewsGiven).toBe(1);

      const bob = metrics.engineers.find((e) => e.engineer === 'bob');
      expect(bob).toBeDefined();
      expect(bob?.prsCreated).toBe(1);
      expect(bob?.reviewsGiven).toBe(1);
    });

    it('handles empty data correctly', () => {
      const metrics = computeOrganizationMetrics('empty', [], [], [], dateRange);

      expect(metrics.engineerCount).toBe(0);
      expect(metrics.totalPRsCreated).toBe(0);
      expect(metrics.totalReviewsGiven).toBe(0);
      expect(metrics.repositories).toEqual([]);
    });
  });

  describe('computeSummaryStatistics', () => {
    it('computes summary correctly for multiple values', () => {
      const summary = computeSummaryStatistics([10, 20, 30, 40, 50]);

      expect(summary.min).toBe(10);
      expect(summary.max).toBe(50);
      expect(summary.avg).toBe(30);
      expect(summary.median).toBe(30);
      expect(summary.total).toBe(150);
    });

    it('computes median correctly for even number of values', () => {
      const summary = computeSummaryStatistics([10, 20, 30, 40]);

      expect(summary.median).toBe(25);
    });

    it('handles single value', () => {
      const summary = computeSummaryStatistics([42]);

      expect(summary.min).toBe(42);
      expect(summary.max).toBe(42);
      expect(summary.avg).toBe(42);
      expect(summary.median).toBe(42);
      expect(summary.total).toBe(42);
    });

    it('handles empty array', () => {
      const summary = computeSummaryStatistics([]);

      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
      expect(summary.avg).toBe(0);
      expect(summary.median).toBe(0);
      expect(summary.total).toBe(0);
    });
  });

  describe('rankEngineersByMetric', () => {
    it('ranks engineers by PRs created', () => {
      const metrics = computeOrganizationMetrics(
        'acme',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );
      const ranked = rankEngineersByMetric(metrics.engineers, 'prsCreated');

      expect(ranked[0]?.engineer).toBe('alice');
      expect(ranked[1]?.engineer).toBe('bob');
    });

    it('does not mutate original array', () => {
      const metrics = computeOrganizationMetrics(
        'acme',
        mockPRs,
        mockReviews,
        mockComments,
        dateRange
      );
      const original = [...metrics.engineers];
      rankEngineersByMetric(metrics.engineers, 'prsCreated');

      expect(metrics.engineers).toEqual(original);
    });
  });
});
