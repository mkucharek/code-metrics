/**
 * Repository Metadata Repository
 * Manages cached repository metadata (default branch, etc.)
 */

import type Database from 'better-sqlite3';
import { z } from 'zod';

const DBRepositoryMetadataSchema = z.object({
  repository: z.string(),
  default_branch: z.string(),
  last_fetched: z.number(),
  created_at: z.number(),
});

export class RepositoryMetadataRepository {
  constructor(private db: Database.Database) {}

  /**
   * Get default branch for a repository (from cache)
   */
  getDefaultBranch(repository: string): string | null {
    const row = this.db
      .prepare(
        `
      SELECT default_branch FROM repository_metadata WHERE repository = ?
    `
      )
      .get(repository);

    if (!row) return null;

    const parsed = z.object({ default_branch: z.string() }).parse(row);
    return parsed.default_branch;
  }

  /**
   * Update default branch for a repository (upsert)
   */
  updateDefaultBranch(repository: string, defaultBranch: string): void {
    const now = Date.now();

    this.db
      .prepare(
        `
      INSERT INTO repository_metadata (repository, default_branch, last_fetched, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(repository) DO UPDATE SET
        default_branch = excluded.default_branch,
        last_fetched = excluded.last_fetched
    `
      )
      .run(repository, defaultBranch, now, now);
  }

  /**
   * Check if cached default branch is stale
   * @param repository Repository name
   * @param maxAgeMs Maximum age in milliseconds (default: 7 days)
   */
  isCacheStale(repository: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    const row = this.db
      .prepare(
        `
      SELECT last_fetched FROM repository_metadata WHERE repository = ?
    `
      )
      .get(repository);

    if (!row) return true; // No cache = stale

    const parsed = z.object({ last_fetched: z.number() }).parse(row);
    const age = Date.now() - parsed.last_fetched;

    return age > maxAgeMs;
  }

  /**
   * Get all cached repository metadata
   */
  getAll(): Array<{
    repository: string;
    defaultBranch: string;
    lastFetched: Date;
    createdAt: Date;
  }> {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM repository_metadata ORDER BY repository
    `
      )
      .all();

    return rows.map((row) => {
      const parsed = DBRepositoryMetadataSchema.parse(row);
      return {
        repository: parsed.repository,
        defaultBranch: parsed.default_branch,
        lastFetched: new Date(parsed.last_fetched),
        createdAt: new Date(parsed.created_at),
      };
    });
  }
}
