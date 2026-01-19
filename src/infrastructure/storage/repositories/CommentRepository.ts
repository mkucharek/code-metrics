/**
 * Comment Repository
 * Handles database operations for comments
 */

import type Database from 'better-sqlite3';
import type { Comment, DateRange } from '../../../domain/models';
import { z } from 'zod';
import {
  CountResultSchema,
  AuthorResultSchema,
  validateQueryResult,
  validateQueryResults,
} from '../query-schemas';

/**
 * Database row schema for comments
 */
const DBCommentSchema = z.object({
  id: z.number(),
  pull_request_id: z.number(),
  repository: z.string(),
  author: z.string(),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  type: z.enum(['issue_comment', 'review_comment']),
  review_id: z.number().nullable(),
  path: z.string().nullable(),
  line: z.number().nullable(),
});

type DBComment = z.infer<typeof DBCommentSchema>;

export class CommentRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to domain model
   */
  private toDomain(row: DBComment): Comment {
    return {
      id: row.id,
      pullRequestId: row.pull_request_id,
      repository: row.repository,
      author: row.author,
      body: row.body,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      type: row.type,
      reviewId: row.review_id,
      path: row.path,
      line: row.line,
    };
  }

  /**
   * Insert or update a comment
   */
  save(comment: Comment): void {
    const stmt = this.db.prepare(`
      INSERT INTO comments (
        id, pull_request_id, repository, author, body,
        created_at, updated_at, type, review_id, path, line
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        body = excluded.body,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      comment.id,
      comment.pullRequestId,
      comment.repository,
      comment.author,
      comment.body,
      comment.createdAt.toISOString(),
      comment.updatedAt.toISOString(),
      comment.type,
      comment.reviewId,
      comment.path,
      comment.line
    );
  }

  /**
   * Save multiple comments in a transaction
   */
  saveBatch(comments: Comment[]): void {
    const transaction = this.db.transaction(() => {
      for (const comment of comments) {
        this.save(comment);
      }
    });

    transaction();
  }

  /**
   * Find comment by ID
   */
  findById(id: number): Comment | null {
    const row = this.db.prepare('SELECT * FROM comments WHERE id = ?').get(id);

    if (!row) return null;

    const parsed = DBCommentSchema.parse(row);
    return this.toDomain(parsed);
  }

  /**
   * Find comments by pull request ID
   */
  findByPullRequestId(pullRequestId: number): Comment[] {
    const rows = this.db
      .prepare('SELECT * FROM comments WHERE pull_request_id = ? ORDER BY created_at DESC')
      .all(pullRequestId);

    return rows.map((row) => this.toDomain(DBCommentSchema.parse(row)));
  }

  /**
   * Find comments by author
   */
  findByAuthor(author: string): Comment[] {
    const rows = this.db
      .prepare('SELECT * FROM comments WHERE author = ? ORDER BY created_at DESC')
      .all(author);

    return rows.map((row) => this.toDomain(DBCommentSchema.parse(row)));
  }

  /**
   * Find comments by author within date range
   */
  findByAuthorAndDateRange(author: string, dateRange: DateRange): Comment[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM comments
         WHERE author = ?
         AND created_at >= ?
         AND created_at <= ?
         ORDER BY created_at DESC`
      )
      .all(author, dateRange.start.toISOString(), dateRange.end.toISOString());

    return rows.map((row) => this.toDomain(DBCommentSchema.parse(row)));
  }

  /**
   * Find comments within date range
   */
  findByDateRange(dateRange: DateRange): Comment[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM comments
         WHERE created_at >= ? AND created_at <= ?
         ORDER BY created_at DESC`
      )
      .all(dateRange.start.toISOString(), dateRange.end.toISOString());

    return rows.map((row) => this.toDomain(DBCommentSchema.parse(row)));
  }

  /**
   * Find comments by review ID
   */
  findByReviewId(reviewId: number): Comment[] {
    const rows = this.db
      .prepare('SELECT * FROM comments WHERE review_id = ? ORDER BY created_at DESC')
      .all(reviewId);

    return rows.map((row) => this.toDomain(DBCommentSchema.parse(row)));
  }

  /**
   * Get unique authors
   */
  getUniqueAuthors(): string[] {
    const rawRows = this.db.prepare('SELECT DISTINCT author FROM comments ORDER BY author').all();

    const rows = validateQueryResults(AuthorResultSchema, rawRows);
    return rows.map((row) => row.author);
  }

  /**
   * Delete comment by ID
   */
  deleteById(id: number): void {
    this.db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  }

  /**
   * Count total comments
   */
  count(): number {
    const rawResult = this.db.prepare('SELECT COUNT(*) as count FROM comments').get();
    const result = validateQueryResult(CountResultSchema, rawResult);
    return result.count;
  }
}
