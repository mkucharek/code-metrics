/**
 * Commit Repository
 * Data access layer for commits
 */

import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { Commit } from '../../../domain/models';
import type { DateRange } from '../../../domain/models/DateRange';

/**
 * Database schema for commits (uses INTEGER for timestamps)
 */
const DBCommitSchema = z.object({
  sha: z.string(),
  repository: z.string(),
  author: z.string(),
  author_email: z.string(),
  committed_at: z.number(),
  message: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changed_files: z.number(),
  parent_count: z.number(),
  pull_request_id: z.number().nullable().optional(),
});

type DBCommit = z.infer<typeof DBCommitSchema>;

export class CommitRepository {
  constructor(private db: Database.Database) {}

  /**
   * Save a commit to the database
   */
  save(commit: Commit): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO commits (
        sha, repository, author, author_email, committed_at,
        message, additions, deletions, changed_files, parent_count, pull_request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        commit.sha,
        commit.repository,
        commit.author,
        commit.authorEmail,
        commit.committedAt.getTime(),
        commit.message,
        commit.additions,
        commit.deletions,
        commit.changedFiles,
        commit.parentCount,
        commit.pullRequestId ?? null
      );
  }

  /**
   * Find commits by author and date range
   */
  findByAuthor(author: string, dateRange: DateRange): Commit[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commits
      WHERE author = ? AND committed_at >= ? AND committed_at <= ?
      ORDER BY committed_at DESC
    `
      )
      .all(author, dateRange.start.getTime(), dateRange.end.getTime());

    return rows.map((row) => this.toDomain(DBCommitSchema.parse(row)));
  }

  /**
   * Find commits by repository and date range
   */
  findByRepository(repository: string, dateRange: DateRange): Commit[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commits
      WHERE repository = ? AND committed_at >= ? AND committed_at <= ?
      ORDER BY committed_at DESC
    `
      )
      .all(repository, dateRange.start.getTime(), dateRange.end.getTime());

    return rows.map((row) => this.toDomain(DBCommitSchema.parse(row)));
  }

  /**
   * Find all commits by date range
   */
  findByDateRange(dateRange: DateRange): Commit[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commits
      WHERE committed_at >= ? AND committed_at <= ?
      ORDER BY committed_at DESC
    `
      )
      .all(dateRange.start.getTime(), dateRange.end.getTime());

    return rows.map((row) => this.toDomain(DBCommitSchema.parse(row)));
  }

  /**
   * Count commits by author
   */
  countByAuthor(author: string, dateRange: DateRange): number {
    const result = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM commits
      WHERE author = ? AND committed_at >= ? AND committed_at <= ?
    `
      )
      .get(author, dateRange.start.getTime(), dateRange.end.getTime()) as { count: number };

    return result.count;
  }

  /**
   * Find PR commits by author and date range
   * Returns commits that have a pullRequestId set (i.e., commits within PRs)
   */
  findPRCommitsByAuthor(author: string, dateRange: DateRange): Commit[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commits
      WHERE author = ? AND committed_at >= ? AND committed_at <= ?
        AND pull_request_id IS NOT NULL
      ORDER BY committed_at DESC
    `
      )
      .all(author, dateRange.start.getTime(), dateRange.end.getTime());

    return rows.map((row) => this.toDomain(DBCommitSchema.parse(row)));
  }

  /**
   * Find commits by pull request ID
   */
  findByPullRequestId(pullRequestId: number): Commit[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commits
      WHERE pull_request_id = ?
      ORDER BY committed_at ASC
    `
      )
      .all(pullRequestId);

    return rows.map((row) => this.toDomain(DBCommitSchema.parse(row)));
  }

  /**
   * Convert database record to domain model
   */
  private toDomain(dbCommit: DBCommit): Commit {
    return {
      sha: dbCommit.sha,
      repository: dbCommit.repository,
      author: dbCommit.author,
      authorEmail: dbCommit.author_email,
      committedAt: new Date(dbCommit.committed_at),
      message: dbCommit.message,
      additions: dbCommit.additions,
      deletions: dbCommit.deletions,
      changedFiles: dbCommit.changed_files,
      parentCount: dbCommit.parent_count,
      pullRequestId: dbCommit.pull_request_id ?? null,
    };
  }
}
