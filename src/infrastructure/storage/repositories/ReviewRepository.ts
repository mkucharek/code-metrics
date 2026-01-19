/**
 * Review Repository
 * Handles database operations for pull request reviews
 */

import type Database from 'better-sqlite3';
import type { Review, DateRange } from '../../../domain/models';
import { z } from 'zod';
import {
  CountResultSchema,
  ReviewerResultSchema,
  validateQueryResult,
  validateQueryResults,
} from '../query-schemas';

/**
 * Database row schema for reviews
 */
const DBReviewSchema = z.object({
  id: z.number(),
  pull_request_id: z.number(),
  repository: z.string(),
  reviewer: z.string(),
  state: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING']),
  submitted_at: z.string(),
  body: z.string(),
  comment_count: z.number(),
});

type DBReview = z.infer<typeof DBReviewSchema>;

export class ReviewRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to domain model
   */
  private toDomain(row: DBReview): Review {
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      repository: row.repository,
      reviewer: row.reviewer,
      state: row.state,
      submittedAt: new Date(row.submitted_at),
      body: row.body,
      commentCount: row.comment_count,
    };
  }

  /**
   * Insert or update a review
   */
  save(review: Review): void {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (
        id, pull_request_id, repository, reviewer, state,
        submitted_at, body, comment_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        body = excluded.body,
        comment_count = excluded.comment_count
    `);

    stmt.run(
      review.id,
      review.pullRequestId,
      review.repository,
      review.reviewer,
      review.state,
      review.submittedAt.toISOString(),
      review.body,
      review.commentCount
    );
  }

  /**
   * Save multiple reviews in a transaction
   */
  saveBatch(reviews: Review[]): void {
    const transaction = this.db.transaction(() => {
      for (const review of reviews) {
        this.save(review);
      }
    });

    transaction();
  }

  /**
   * Find review by ID
   */
  findById(id: number): Review | null {
    const row = this.db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);

    if (!row) return null;

    const parsed = DBReviewSchema.parse(row);
    return this.toDomain(parsed);
  }

  /**
   * Find reviews by pull request ID
   */
  findByPullRequestId(pullRequestId: number): Review[] {
    const rows = this.db
      .prepare('SELECT * FROM reviews WHERE pull_request_id = ? ORDER BY submitted_at DESC')
      .all(pullRequestId);

    return rows.map((row) => this.toDomain(DBReviewSchema.parse(row)));
  }

  /**
   * Find reviews by reviewer
   */
  findByReviewer(reviewer: string): Review[] {
    const rows = this.db
      .prepare('SELECT * FROM reviews WHERE reviewer = ? ORDER BY submitted_at DESC')
      .all(reviewer);

    return rows.map((row) => this.toDomain(DBReviewSchema.parse(row)));
  }

  /**
   * Find reviews by reviewer within date range
   */
  findByReviewerAndDateRange(reviewer: string, dateRange: DateRange): Review[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM reviews
         WHERE reviewer = ?
         AND submitted_at >= ?
         AND submitted_at <= ?
         ORDER BY submitted_at DESC`
      )
      .all(reviewer, dateRange.start.toISOString(), dateRange.end.toISOString());

    return rows.map((row) => this.toDomain(DBReviewSchema.parse(row)));
  }

  /**
   * Find reviews within date range
   */
  findByDateRange(dateRange: DateRange): Review[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM reviews
         WHERE submitted_at >= ? AND submitted_at <= ?
         ORDER BY submitted_at DESC`
      )
      .all(dateRange.start.toISOString(), dateRange.end.toISOString());

    return rows.map((row) => this.toDomain(DBReviewSchema.parse(row)));
  }

  /**
   * Get unique reviewers
   */
  getUniqueReviewers(): string[] {
    const rawRows = this.db
      .prepare('SELECT DISTINCT reviewer FROM reviews ORDER BY reviewer')
      .all();

    const rows = validateQueryResults(ReviewerResultSchema, rawRows);
    return rows.map((row) => row.reviewer);
  }

  /**
   * Delete review by ID
   */
  deleteById(id: number): void {
    this.db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  }

  /**
   * Count total reviews
   */
  count(): number {
    const rawResult = this.db.prepare('SELECT COUNT(*) as count FROM reviews').get();
    const result = validateQueryResult(CountResultSchema, rawResult);
    return result.count;
  }
}
