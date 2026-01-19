/**
 * Sync Service
 * Orchestrates GitHub data synchronization
 */

import type { Database } from 'better-sqlite3';
import { GitHubClient, GitHubSynchronizer } from '../../infrastructure/github';
import type { SyncSummary, SyncOptions as GitHubSyncOptions } from '../../infrastructure/github';
import {
  PRRepository,
  ReviewRepository,
  CommentRepository,
  SyncMetadataRepository,
  CommitRepository,
  CommitFileRepository,
  RepositoryMetadataRepository,
} from '../../infrastructure/storage/repositories';
import { initializeDatabase } from '../../infrastructure/storage/database';
import { applyMigrations, ALL_MIGRATIONS } from '../../infrastructure/storage/migrations';
import type { Logger } from '../../infrastructure/logging';
import { CLILogger } from '../../infrastructure/logging';
import type { AppConfig } from '../../infrastructure/config/schema';
import {
  parseLocalDate,
  parseLocalDateEndOfDay,
  getDaysAgo,
  getEndOfToday,
} from '../../domain/utils/dates';

/**
 * Options for sync operation
 */
export interface SyncOptions {
  /** Optional: specific repository to sync (syncs all if not provided) */
  repo?: string;
  /** Optional: repositories to exclude (comma-separated) */
  excludeRepo?: string;
  /** Start date (ISO format or days ago as number) */
  since: string;
  /** Optional: end date (ISO format, defaults to end of today) */
  until?: string;
  /** Force resync even if already synced */
  force: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Parsed date range for sync
 */
export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Sync Service Dependencies
 */
export interface SyncServiceDependencies {
  config: AppConfig;
  logger?: Logger;
}

/**
 * Sync Service
 * Handles all sync-related business logic
 */
export class SyncService {
  private db: Database | null = null;
  private config: AppConfig;
  private logger: Logger;
  private synchronizer: GitHubSynchronizer | null = null;

  constructor(dependencies: SyncServiceDependencies) {
    this.config = dependencies.config;
    this.logger =
      dependencies.logger ||
      new CLILogger({
        level: dependencies.config.logging.level,
        colored: dependencies.config.logging.colored,
      });
  }

  /**
   * Initialize database and apply migrations
   */
  private initializeDatabase(): Database {
    if (!this.db) {
      this.db = initializeDatabase(this.config.database);
      applyMigrations(this.db, ALL_MIGRATIONS);
    }
    return this.db;
  }

  /**
   * Create and cache synchronizer instance
   */
  private getSynchronizer(): GitHubSynchronizer {
    if (!this.synchronizer) {
      const db = this.initializeDatabase();

      // Create repositories
      const prRepo = new PRRepository(db);
      const reviewRepo = new ReviewRepository(db);
      const commentRepo = new CommentRepository(db);
      const syncMetadataRepo = new SyncMetadataRepository(db);
      const commitRepo = new CommitRepository(db);
      const commitFileRepo = new CommitFileRepository(db);
      const repoMetadataRepo = new RepositoryMetadataRepository(db);

      // Create GitHub client
      const githubClient = new GitHubClient(this.config.github, this.logger);

      // Create synchronizer
      this.synchronizer = new GitHubSynchronizer(
        githubClient,
        prRepo,
        reviewRepo,
        commentRepo,
        syncMetadataRepo,
        commitRepo,
        commitFileRepo,
        repoMetadataRepo
      );
    }

    return this.synchronizer;
  }

  /**
   * Parse date options into Date objects
   */
  parseDateRange(options: Pick<SyncOptions, 'since' | 'until'>): ParsedDateRange {
    let startDate: Date;
    let endDate: Date;

    if (options.since.match(/^\d+$/)) {
      // Days ago
      const daysAgo = parseInt(options.since, 10);
      startDate = getDaysAgo(daysAgo);
      endDate = options.until ? parseLocalDateEndOfDay(options.until) : getEndOfToday();
    } else {
      // ISO dates (YYYY-MM-DD)
      startDate = parseLocalDate(options.since);
      endDate = options.until ? parseLocalDateEndOfDay(options.until) : getEndOfToday();
    }

    return { startDate, endDate };
  }

  /**
   * Sync GitHub data to local database
   */
  async sync(options: SyncOptions, onProgress?: (message: string) => void): Promise<SyncSummary> {
    // Parse dates
    const { startDate, endDate } = this.parseDateRange(options);

    // Get synchronizer
    const synchronizer = this.getSynchronizer();

    // Build sync options
    const syncOptions: GitHubSyncOptions = {
      repo: options.repo,
      excludeRepos: options.excludeRepo
        ? options.excludeRepo.split(',').map((r) => r.trim())
        : undefined,
      startDate,
      endDate,
      force: options.force,
      verbose: options.verbose ?? false,
    };

    // Run sync
    return await synchronizer.sync(syncOptions, onProgress);
  }

  /**
   * Format sync summary for display
   */
  formatSummary(summary: SyncSummary): string {
    const synchronizer = this.getSynchronizer();
    return synchronizer.formatSummary(summary);
  }

  /**
   * Get database statistics
   */
  getStatistics(): {
    pullRequests: number;
    reviews: number;
    comments: number;
  } {
    const db = this.initializeDatabase();
    const prRepo = new PRRepository(db);
    const reviewRepo = new ReviewRepository(db);
    const commentRepo = new CommentRepository(db);

    return {
      pullRequests: prRepo.count(),
      reviews: reviewRepo.count(),
      comments: commentRepo.count(),
    };
  }

  /**
   * Get synced repositories
   */
  getSyncedRepositories(): string[] {
    const db = this.initializeDatabase();
    const syncMetadataRepo = new SyncMetadataRepository(db);
    return syncMetadataRepo.getRepositories(this.config.github.organization);
  }

  /**
   * Get sync metadata for a repository
   */
  getRepositorySyncInfo(repository: string): Array<{
    resourceType: string;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    lastSyncAt: Date;
    itemsSynced: number;
  }> {
    const db = this.initializeDatabase();
    const syncMetadataRepo = new SyncMetadataRepository(db);
    return syncMetadataRepo.findByRepository(this.config.github.organization, repository);
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.synchronizer = null;
    }
  }
}
