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
  CommitRepository,
  CommitFileRepository,
  RepositoryMetadataRepository,
  DailySyncMetadataRepository,
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
import { formatDateKey, formatDaysWithGaps } from '../../domain/utils/dateRange';

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
  /** Skip quota pre-check (sync repo even with low remaining quota) */
  skipQuotaCheck?: boolean;
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
      const commitRepo = new CommitRepository(db);
      const commitFileRepo = new CommitFileRepository(db);
      const repoMetadataRepo = new RepositoryMetadataRepository(db);
      const dailySyncMetadataRepo = new DailySyncMetadataRepository(db);

      // Create GitHub client
      const githubClient = new GitHubClient(this.config.github, this.logger);

      // Create synchronizer
      this.synchronizer = new GitHubSynchronizer(
        githubClient,
        prRepo,
        reviewRepo,
        commentRepo,
        commitRepo,
        commitFileRepo,
        repoMetadataRepo,
        dailySyncMetadataRepo
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
      skipQuotaCheck: options.skipQuotaCheck ?? false,
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
   * Get synced repositories (from per-day sync metadata)
   */
  getSyncedRepositories(): string[] {
    const db = this.initializeDatabase();
    const dailySyncRepo = new DailySyncMetadataRepository(db);
    const summary = dailySyncRepo.getSyncSummary(this.config.github.organization);

    const repos = new Set<string>();
    for (const entry of summary) {
      repos.add(entry.repository);
    }
    return Array.from(repos).sort();
  }

  /**
   * Get sync metadata for a repository (derived from per-day sync data)
   */
  getRepositorySyncInfo(repository: string): Array<{
    resourceType: string;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    lastSyncAt: Date;
    itemsSynced: number;
  }> {
    const db = this.initializeDatabase();
    const dailySyncRepo = new DailySyncMetadataRepository(db);

    // Get date range coverage from daily sync metadata
    const coverage = dailySyncRepo.getDateRangeCoverage(
      'pull_requests',
      this.config.github.organization,
      repository
    );

    if (!coverage) {
      return [];
    }

    // Get the most recent sync timestamp
    const lastSyncAt = dailySyncRepo.getLastSyncAt(
      'pull_requests',
      this.config.github.organization,
      repository
    );

    return [
      {
        resourceType: 'pull_requests',
        dateRangeStart: new Date(coverage.minDate),
        dateRangeEnd: new Date(coverage.maxDate),
        lastSyncAt: lastSyncAt || new Date(),
        itemsSynced: coverage.dayCount,
      },
    ];
  }

  /**
   * Get per-day sync coverage for a repository
   */
  getDailySyncCoverage(
    repository: string,
    startDate?: Date,
    endDate?: Date
  ): {
    syncedDays: string[];
    ranges: string;
    gaps: string[];
    coverage: { minDate: string; maxDate: string; dayCount: number } | null;
  } {
    const db = this.initializeDatabase();
    const dailySyncRepo = new DailySyncMetadataRepository(db);

    const startKey = startDate ? formatDateKey(startDate) : '1970-01-01';
    const endKey = endDate ? formatDateKey(endDate) : '2100-01-01';

    const syncedDays = dailySyncRepo.getSyncedDays(
      'pull_requests',
      this.config.github.organization,
      repository,
      startKey,
      endKey
    );

    const { ranges, gaps } = formatDaysWithGaps(syncedDays);
    const coverage = dailySyncRepo.getDateRangeCoverage(
      'pull_requests',
      this.config.github.organization,
      repository
    );

    return { syncedDays, ranges, gaps, coverage };
  }

  /**
   * Get all repositories with daily sync data
   */
  getRepositoriesWithDailySync(): string[] {
    const db = this.initializeDatabase();
    const dailySyncRepo = new DailySyncMetadataRepository(db);
    const summary = dailySyncRepo.getSyncSummary(this.config.github.organization);

    const repos = new Set<string>();
    for (const entry of summary) {
      repos.add(entry.repository);
    }
    return Array.from(repos).sort();
  }

  /**
   * Get actual data coverage from the database
   * Shows what PRs are really stored, not just sync metadata
   */
  getActualDataCoverage(): {
    prs: Array<{
      repository: string;
      prCount: number;
      minCreatedAt: string | null;
      maxCreatedAt: string | null;
      minMergedAt: string | null;
      maxMergedAt: string | null;
    }>;
    commits: Array<{
      repository: string;
      commitCount: number;
      prCommitCount: number;
      directCommitCount: number;
      minCommittedAt: string | null;
      maxCommittedAt: string | null;
    }>;
    totals: {
      totalPRs: number;
      totalReviews: number;
      totalComments: number;
      totalCommits: number;
    };
  } {
    const db = this.initializeDatabase();
    const prRepo = new PRRepository(db);
    const commitRepo = new CommitRepository(db);
    const reviewRepo = new ReviewRepository(db);
    const commentRepo = new CommentRepository(db);

    return {
      prs: prRepo.getDataCoverage(),
      commits: commitRepo.getDataCoverage(),
      totals: {
        totalPRs: prRepo.count(),
        totalReviews: reviewRepo.count(),
        totalComments: commentRepo.count(),
        totalCommits: (db.prepare('SELECT COUNT(*) as count FROM commits').get() as {
          count: number;
        })
          ? (db.prepare('SELECT COUNT(*) as count FROM commits').get() as { count: number }).count
          : 0,
      },
    };
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
