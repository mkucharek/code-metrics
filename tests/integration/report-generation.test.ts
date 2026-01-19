/**
 * Integration Tests: Report Generation
 * End-to-end tests for full sync → report flow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeTables } from '../../src/infrastructure/storage/schemas';
import { ReportGenerator } from '../../src/application';
import {
  formatOrganizationReport,
  formatEngineerDetailReport,
  formatEngineerDetailJSON,
  formatEngineerDetailCSV,
} from '../../src/presentation/formatters';
import type { PullRequest, Review, Comment } from '../../src/domain/models';

describe('Integration: Report Generation', () => {
  let db: Database.Database;
  let reportGenerator: ReportGenerator;

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    initializeTables(db);
    // Apply migration 005 to add body column
    db.exec(`ALTER TABLE pull_requests ADD COLUMN body TEXT NOT NULL DEFAULT '';`);
    // Apply migration 006 to add merged_by column
    db.exec(`ALTER TABLE pull_requests ADD COLUMN merged_by TEXT;`);
    // Apply migration 007 to add branch columns
    db.exec(`ALTER TABLE pull_requests ADD COLUMN head_branch TEXT NOT NULL DEFAULT '';`);
    db.exec(`ALTER TABLE pull_requests ADD COLUMN base_branch TEXT NOT NULL DEFAULT '';`);
    // Apply migration 008 to add requested_reviewers column
    db.exec(`ALTER TABLE pull_requests ADD COLUMN requested_reviewers TEXT NOT NULL DEFAULT '[]';`);
    reportGenerator = new ReportGenerator(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Test Fixtures
   */
  const mockPRs: PullRequest[] = [
    {
      id: 1,
      number: 101,
      repository: 'web-app',
      author: 'alice',
      title: 'Add authentication',
      body: '',
      state: 'merged',
      mergedBy: null,
      headBranch: 'feature',
      baseBranch: 'main',
      createdAt: new Date('2025-09-01'),
      updatedAt: new Date('2025-09-02'),
      mergedAt: new Date('2025-09-02'),
      closedAt: new Date('2025-09-02'),
      additions: 150,
      deletions: 30,
      changedFiles: 5,
      commentCount: 3,
      reviewCommentCount: 2,
      commitCount: 4,
      labels: ['feature'],
      isDraft: false,
      requestedReviewers: [],
    },
    {
      id: 2,
      number: 102,
      repository: 'api-app-data',
      author: 'bob',
      title: 'Fix bug in data processing',
      body: '',
      state: 'merged',
      mergedBy: null,
      headBranch: 'feature',
      baseBranch: 'main',
      createdAt: new Date('2025-09-03'),
      updatedAt: new Date('2025-09-04'),
      mergedAt: new Date('2025-09-04'),
      closedAt: new Date('2025-09-04'),
      additions: 50,
      deletions: 20,
      changedFiles: 2,
      commentCount: 1,
      reviewCommentCount: 1,
      commitCount: 2,
      labels: ['bug'],
      isDraft: false,
      requestedReviewers: [],
    },
    {
      id: 3,
      number: 103,
      repository: 'web-app',
      author: 'alice',
      title: 'Update dependencies',
      body: '',
      state: 'open',
      mergedBy: null,
      headBranch: 'deps-update',
      baseBranch: 'main',
      createdAt: new Date('2025-09-05'),
      updatedAt: new Date('2025-09-05'),
      mergedAt: null,
      closedAt: null,
      additions: 10,
      deletions: 10,
      changedFiles: 1,
      commentCount: 0,
      reviewCommentCount: 0,
      commitCount: 1,
      labels: ['chore'],
      isDraft: false,
      requestedReviewers: [],
    },
  ];

  const mockReviews: Review[] = [
    {
      id: 1,
      pullRequestId: 1,
      repository: 'web-app',
      reviewer: 'bob',
      state: 'APPROVED',
      submittedAt: new Date('2025-09-02'),
      body: 'Great work!',
      commentCount: 2,
    },
    {
      id: 2,
      pullRequestId: 2,
      repository: 'api-app-data',
      reviewer: 'alice',
      state: 'APPROVED',
      submittedAt: new Date('2025-09-04'),
      body: 'LGTM',
      commentCount: 1,
    },
  ];

  const mockComments: Comment[] = [
    {
      id: 1,
      pullRequestId: 1,
      repository: 'web-app',
      author: 'bob',
      body: 'Looks good!',
      createdAt: new Date('2025-09-02'),
      updatedAt: new Date('2025-09-02'),
      type: 'issue_comment',
      reviewId: null,
      path: null,
      line: null,
    },
    {
      id: 2,
      pullRequestId: 1,
      repository: 'web-app',
      author: 'alice',
      body: 'Thanks for the review',
      createdAt: new Date('2025-09-02'),
      updatedAt: new Date('2025-09-02'),
      type: 'issue_comment',
      reviewId: null,
      path: null,
      line: null,
    },
  ];

  /**
   * Helper: Seed database with test data
   */
  function seedDatabase() {
    const prRepo = reportGenerator['prRepository'];
    const reviewRepo = reportGenerator['reviewRepository'];
    const commentRepo = reportGenerator['commentRepository'];

    mockPRs.forEach((pr) => prRepo.save(pr));
    mockReviews.forEach((review) => reviewRepo.save(review));
    mockComments.forEach((comment) => commentRepo.save(comment));
  }

  describe('Organization Report', () => {
    it('generates organization report with correct metrics', () => {
      seedDatabase();

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
      });

      expect(report.organization).toBe('test-org');
      expect(report.engineerCount).toBe(2); // alice, bob
      expect(report.totalPRsCreated).toBe(3);
      expect(report.totalPRsMerged).toBe(2);
      expect(report.totalLinesAdded).toBe(210);
      expect(report.totalLinesDeleted).toBe(60);
      expect(report.avgPRSize).toBe(90); // (180 + 70 + 20) / 3
      expect(report.engineers).toHaveLength(2);
    });

    it('generates organization report with repository filter', () => {
      seedDatabase();

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        repositories: ['web-app'],
      });

      expect(report.totalPRsCreated).toBe(2); // Only web-app PRs
      expect(report.engineerCount).toBe(2); // alice (author) and bob (reviewer)
    });

    it('generates organization report with bot filtering', () => {
      // Add a bot PR
      const botPR: PullRequest = {
        ...mockPRs[0]!,
        id: 4,
        number: 104,
        author: 'dependabot[bot]',
      };

      const prRepo = reportGenerator['prRepository'];
      mockPRs.forEach((pr) => prRepo.save(pr));
      prRepo.save(botPR);

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        includeBots: false,
      });

      expect(report.totalPRsCreated).toBe(3); // Bot PR excluded
      expect(report.engineerCount).toBe(2); // Bot not counted
    });

    it('generates organization report with user exclusion', () => {
      seedDatabase();

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        excludedUsers: ['bob'],
      });

      expect(report.totalPRsCreated).toBe(2); // Only alice's PRs
      expect(report.engineerCount).toBe(1); // Only alice
    });

    it('handles empty database gracefully', () => {
      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
      });

      expect(report.engineerCount).toBe(0);
      expect(report.totalPRsCreated).toBe(0);
      expect(report.totalPRsMerged).toBe(0);
      expect(report.engineers).toHaveLength(0);
    });
  });

  describe('Engineer Detail Report', () => {
    it('generates engineer detail report with all sections', () => {
      seedDatabase();

      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
      });

      expect(report.engineer).toBe('alice');
      expect(report.organization).toBe('test-org');

      // Summary stats
      expect(report.summary.totalWeeks).toBeGreaterThan(0);
      expect(report.summary.avgPRsPerWeek).toBeGreaterThan(0);

      // Activity
      expect(report.activity.prsOpened).toBe(2);
      expect(report.activity.prsMerged).toBe(1);
      // Only count lines from merged PRs (PR #101: 150+30, PR #103 is open so not counted)
      expect(report.activity.linesAdded).toBe(150);
      expect(report.activity.linesDeleted).toBe(30);

      // Reviews
      expect(report.reviews.prsReviewed).toBe(1); // alice reviewed PR #2

      // Repositories (alice has PRs in web-app only)
      expect(report.repositories).toHaveLength(1);
      expect(report.repositories[0].repository).toBe('web-app')

      // Timeline
      expect(report.timeline.length).toBeGreaterThan(0);

      // PRs
      expect(report.prs).toHaveLength(2);

      // Heatmap
      expect(report.contributionHeatmap.length).toBeGreaterThan(0);
    });

    it('generates engineer detail report with repository filter', () => {
      seedDatabase();

      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
        repositories: ['web-app'],
      });

      expect(report.activity.prsOpened).toBe(2); // Only web-app PRs
      expect(report.repositories).toHaveLength(1);
      expect(report.repositories[0].repository).toBe('web-app');
    });

    it('handles engineer with no activity', () => {
      seedDatabase();

      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'charlie',
      });

      expect(report.activity.prsOpened).toBe(0);
      expect(report.activity.prsMerged).toBe(0);
      expect(report.reviews.prsReviewed).toBe(0);
      expect(report.prs).toHaveLength(0);
    });
  });

  describe('Formatters', () => {
    beforeEach(() => {
      seedDatabase();
    });

    it('formats organization report as Markdown', () => {
      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
      });

      const markdown = formatOrganizationReport(report);

      expect(markdown).toContain('# Engineering Metrics Report');
      expect(markdown).toContain('**Organization:** test-org');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('**Engineers:** 2');
      expect(markdown).toContain('**Total PRs:** 3');
    });

    it('formats engineer detail report as Markdown', () => {
      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
      });

      const markdown = formatEngineerDetailReport(report);

      expect(markdown).toContain('# Engineering Report: alice');
      expect(markdown).toContain('## 📋 Summary');
      expect(markdown).toContain('## 📊 Code Contributions');
      expect(markdown).toContain('## 🤝 Collaboration & Code Reviews');
      expect(markdown).toContain('## 📝 Pull Requests');
    });

    it('groups PRs by state in engineer detail report', () => {
      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
      });

      const markdown = formatEngineerDetailReport(report);

      // Should have grouped sections
      expect(markdown).toContain('## 📝 Pull Requests');
      expect(markdown).toContain('### ✅ Merged PRs');

      // Should have Age column for open PRs (if any)
      // Should have Time to Merge column for merged PRs
      expect(markdown).toContain('Time to Merge');

      // Should not have Status column (state is in section headers now)
      const prSection = markdown.split('## 📝 Pull Requests')[1];
      if (prSection) {
        // Check that table headers don't include Status column
        expect(prSection).not.toContain('| Status |');
      }
    });

    it('formats engineer detail report as JSON', () => {
      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
      });

      const json = formatEngineerDetailJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.engineer).toBe('alice');
      expect(parsed.activity.prsOpened).toBe(2);
      expect(parsed.summary).toBeDefined();
    });

    it('formats engineer detail report as CSV', () => {
      const report = reportGenerator.generateEngineerDetailReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
        engineer: 'alice',
      });

      const csv = formatEngineerDetailCSV(report);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Week,Repository,PR Number');
      expect(lines.length).toBeGreaterThan(1); // Header + data rows
      expect(csv).toContain('web-app');
    });
  });

  describe('Edge Cases', () => {
    it('handles single PR correctly', () => {
      const prRepo = reportGenerator['prRepository'];
      prRepo.save(mockPRs[0]);

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
      });

      expect(report.totalPRsCreated).toBe(1);
      expect(report.engineerCount).toBe(1);
    });

    it('handles PRs with null merge dates', () => {
      const prRepo = reportGenerator['prRepository'];
      prRepo.save(mockPRs[2]); // Open PR with null mergedAt

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2025-09-01'),
          end: new Date('2025-09-30'),
        },
      });

      expect(report.totalPRsCreated).toBe(1);
      expect(report.totalPRsMerged).toBe(0);
    });

    it('handles date range with no data', () => {
      seedDatabase();

      const report = reportGenerator.generateOrganizationReport({
        organization: 'test-org',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      });

      expect(report.totalPRsCreated).toBe(0);
      expect(report.engineerCount).toBe(0);
    });
  });
});
