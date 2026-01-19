import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { PRRepository } from './PRRepository';
import { initializeTables } from '../schemas';
import type { PullRequest } from '../../../domain/models';

describe('PRRepository', () => {
  let db: Database.Database;
  let repo: PRRepository;

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
    repo = new PRRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  const mockPR: PullRequest = {
    id: 1,
    number: 101,
    repository: 'org/repo',
    author: 'alice',
    title: 'Add feature',
    body: 'This PR adds a new feature',
    state: 'open',
    mergedBy: null,
    headBranch: 'feature-branch',
    baseBranch: 'main',
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2025-09-15'),
    mergedAt: null,
    closedAt: null,
    additions: 100,
    deletions: 20,
    changedFiles: 3,
    commentCount: 5,
    reviewCommentCount: 2,
    commitCount: 4,
    labels: ['feature', 'enhancement'],
    isDraft: false,
    requestedReviewers: [],
  };

  describe('save', () => {
    it('saves a new pull request', () => {
      repo.save(mockPR);

      const found = repo.findById(1);
      expect(found).not.toBeNull();
      expect(found?.author).toBe('alice');
      expect(found?.title).toBe('Add feature');
      expect(found?.labels).toEqual(['feature', 'enhancement']);
    });

    it('updates an existing pull request', () => {
      repo.save(mockPR);

      const updated = { ...mockPR, state: 'merged' as const, mergedAt: new Date('2025-09-16') };
      repo.save(updated);

      const found = repo.findById(1);
      expect(found?.state).toBe('merged');
      expect(found?.mergedAt).toEqual(new Date('2025-09-16'));
    });
  });

  describe('saveBatch', () => {
    it('saves multiple PRs in a transaction', () => {
      const prs = [
        mockPR,
        { ...mockPR, id: 2, number: 102, author: 'bob' },
        { ...mockPR, id: 3, number: 103, author: 'charlie' },
      ];

      repo.saveBatch(prs);

      expect(repo.count()).toBe(3);
      expect(repo.findById(2)?.author).toBe('bob');
      expect(repo.findById(3)?.author).toBe('charlie');
    });
  });

  describe('findByAuthor', () => {
    it('returns PRs by author', () => {
      repo.save(mockPR);
      repo.save({ ...mockPR, id: 2, number: 102, author: 'bob' });
      repo.save({ ...mockPR, id: 3, number: 103, author: 'alice' });

      const alicePRs = repo.findByAuthor('alice');
      expect(alicePRs).toHaveLength(2);
      expect(alicePRs.every((pr) => pr.author === 'alice')).toBe(true);
    });

    it('returns empty array for unknown author', () => {
      repo.save(mockPR);

      const prs = repo.findByAuthor('nobody');
      expect(prs).toHaveLength(0);
    });
  });

  describe('findByDateRange', () => {
    it('filters PRs by date range', () => {
      repo.save({ ...mockPR, id: 1, number: 101, createdAt: new Date('2025-09-10') });
      repo.save({ ...mockPR, id: 2, number: 102, createdAt: new Date('2025-09-15') });
      repo.save({ ...mockPR, id: 3, number: 103, createdAt: new Date('2025-09-20') });

      const prs = repo.findByDateRange({
        start: new Date('2025-09-12'),
        end: new Date('2025-09-18'),
      });

      expect(prs).toHaveLength(1);
      expect(prs[0]?.id).toBe(2);
    });
  });

  describe('getUniqueAuthors', () => {
    it('returns sorted list of unique authors', () => {
      repo.save({ ...mockPR, id: 1, number: 101, author: 'charlie' });
      repo.save({ ...mockPR, id: 2, number: 102, author: 'alice' });
      repo.save({ ...mockPR, id: 3, number: 103, author: 'bob' });
      repo.save({ ...mockPR, id: 4, number: 104, author: 'alice' });

      const authors = repo.getUniqueAuthors();
      expect(authors).toEqual(['alice', 'bob', 'charlie']);
    });
  });

  describe('deleteById', () => {
    it('deletes a PR', () => {
      repo.save(mockPR);
      expect(repo.findById(1)).not.toBeNull();

      repo.deleteById(1);
      expect(repo.findById(1)).toBeNull();
    });
  });

  describe('count', () => {
    it('returns total count', () => {
      expect(repo.count()).toBe(0);

      repo.save(mockPR);
      expect(repo.count()).toBe(1);

      repo.save({ ...mockPR, id: 2, number: 102 });
      expect(repo.count()).toBe(2);
    });
  });
});
