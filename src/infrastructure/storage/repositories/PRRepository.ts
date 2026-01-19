/**
 * Pull Request Repository
 * Handles database operations for pull requests
 */

import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { DateRange, PullRequest } from '../../../domain/models';
import {
  AuthorResultSchema,
  CountResultSchema,
  validateQueryResult,
  validateQueryResults,
} from '../query-schemas';

/**
 * Database row schema for pull requests
 */
const DBPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  repository: z.string(),
  author: z.string(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed', 'merged']),
  merged_by: z.string().nullable(),
  head_branch: z.string(),
  base_branch: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  merged_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  additions: z.number(),
  deletions: z.number(),
  changed_files: z.number(),
  comment_count: z.number(),
  review_comment_count: z.number(),
  commit_count: z.number(),
  labels: z.string(),
  is_draft: z.number(),
  requested_reviewers: z.string(),
});

type DBPullRequest = z.infer<typeof DBPullRequestSchema>;

export class PRRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to domain model
   */
  private toDomain(row: DBPullRequest): PullRequest {
    return {
      id: row.id,
      number: row.number,
      repository: row.repository,
      author: row.author,
      title: row.title,
      body: row.body,
      state: row.state,
      mergedBy: row.merged_by,
      headBranch: row.head_branch,
      baseBranch: row.base_branch,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      mergedAt: row.merged_at ? new Date(row.merged_at) : null,
      closedAt: row.closed_at ? new Date(row.closed_at) : null,
      additions: row.additions,
      deletions: row.deletions,
      changedFiles: row.changed_files,
      commentCount: row.comment_count,
      reviewCommentCount: row.review_comment_count,
      commitCount: row.commit_count,
      labels: z.array(z.string()).parse(JSON.parse(row.labels)),
      isDraft: row.is_draft === 1,
      requestedReviewers: z.array(z.string()).parse(JSON.parse(row.requested_reviewers)),
    };
  }

  /**
   * Insert or update a pull request
   */
  save(pr: PullRequest): void {
    const stmt = this.db.prepare(`
      INSERT INTO pull_requests (
        id, number, repository, author, title, body, state, merged_by, head_branch, base_branch,
        created_at, updated_at, merged_at, closed_at,
        additions, deletions, changed_files,
        comment_count, review_comment_count, commit_count,
        labels, is_draft, requested_reviewers
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        body = excluded.body,
        state = excluded.state,
        merged_by = excluded.merged_by,
        head_branch = excluded.head_branch,
        base_branch = excluded.base_branch,
        updated_at = excluded.updated_at,
        merged_at = excluded.merged_at,
        closed_at = excluded.closed_at,
        additions = excluded.additions,
        deletions = excluded.deletions,
        changed_files = excluded.changed_files,
        comment_count = excluded.comment_count,
        review_comment_count = excluded.review_comment_count,
        commit_count = excluded.commit_count,
        labels = excluded.labels,
        is_draft = excluded.is_draft,
        requested_reviewers = excluded.requested_reviewers
    `);

    stmt.run(
      pr.id,
      pr.number,
      pr.repository,
      pr.author,
      pr.title,
      pr.body,
      pr.state,
      pr.mergedBy,
      pr.headBranch,
      pr.baseBranch,
      pr.createdAt.toISOString(),
      pr.updatedAt.toISOString(),
      pr.mergedAt?.toISOString() ?? null,
      pr.closedAt?.toISOString() ?? null,
      pr.additions,
      pr.deletions,
      pr.changedFiles,
      pr.commentCount,
      pr.reviewCommentCount,
      pr.commitCount,
      JSON.stringify(pr.labels),
      pr.isDraft ? 1 : 0,
      JSON.stringify(pr.requestedReviewers)
    );
  }

  /**
   * Save multiple pull requests in a transaction
   */
  saveBatch(prs: PullRequest[]): void {
    const transaction = this.db.transaction(() => {
      for (const pr of prs) {
        this.save(pr);
      }
    });

    transaction();
  }

  /**
   * Find pull request by ID
   */
  findById(id: number): PullRequest | null {
    const row = this.db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(id);

    if (!row) return null;

    const parsed = DBPullRequestSchema.parse(row);
    return this.toDomain(parsed);
  }

  /**
   * Find all pull requests by author
   */
  findByAuthor(author: string): PullRequest[] {
    const rows = this.db
      .prepare('SELECT * FROM pull_requests WHERE author = ? ORDER BY created_at DESC')
      .all(author);

    return rows.map((row) => this.toDomain(DBPullRequestSchema.parse(row)));
  }

  /**
   * Find pull requests by author within date range
   * Includes PRs where created_at OR merged_at OR closed_at falls within range
   */
  findByAuthorAndDateRange(author: string, dateRange: DateRange): PullRequest[] {
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();

    const rows = this.db
      .prepare(
        `SELECT * FROM pull_requests
         WHERE author = ?
         AND ((created_at >= ? AND created_at <= ?)
            OR (merged_at >= ? AND merged_at <= ?)
            OR (closed_at >= ? AND closed_at <= ?))
         ORDER BY created_at DESC`
      )
      .all(author, startDate, endDate, startDate, endDate, startDate, endDate);

    return rows.map((row) => this.toDomain(DBPullRequestSchema.parse(row)));
  }

  /**
   * Find pull requests by repository
   */
  findByRepository(repository: string): PullRequest[] {
    const rows = this.db
      .prepare('SELECT * FROM pull_requests WHERE repository = ? ORDER BY created_at DESC')
      .all(repository);

    return rows.map((row) => this.toDomain(DBPullRequestSchema.parse(row)));
  }

  /**
   * Find pull requests within date range
   * Includes PRs where created_at OR merged_at OR closed_at falls within range
   */
  findByDateRange(dateRange: DateRange): PullRequest[] {
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();

    const rows = this.db
      .prepare(
        `SELECT * FROM pull_requests
         WHERE (created_at >= ? AND created_at <= ?)
            OR (merged_at >= ? AND merged_at <= ?)
            OR (closed_at >= ? AND closed_at <= ?)
         ORDER BY created_at DESC`
      )
      .all(startDate, endDate, startDate, endDate, startDate, endDate);

    return rows.map((row) => this.toDomain(DBPullRequestSchema.parse(row)));
  }

  /**
   * Get unique authors
   */
  getUniqueAuthors(): string[] {
    const rawRows = this.db
      .prepare('SELECT DISTINCT author FROM pull_requests ORDER BY author')
      .all();

    const rows = validateQueryResults(AuthorResultSchema, rawRows);
    return rows.map((row) => row.author);
  }

  /**
   * Get unique repositories
   */
  getUniqueRepositories(): string[] {
    const RepositoryResultSchema = z.object({ repository: z.string() });
    const rawRows = this.db
      .prepare('SELECT DISTINCT repository FROM pull_requests ORDER BY repository')
      .all();

    const rows = validateQueryResults(RepositoryResultSchema, rawRows);
    return rows.map((row) => row.repository);
  }

  /**
   * Delete pull request by ID
   */
  deleteById(id: number): void {
    this.db.prepare('DELETE FROM pull_requests WHERE id = ?').run(id);
  }

  /**
   * Count total pull requests
   */
  count(): number {
    const rawResult = this.db.prepare('SELECT COUNT(*) as count FROM pull_requests').get();
    const result = validateQueryResult(CountResultSchema, rawResult);
    return result.count;
  }
}
