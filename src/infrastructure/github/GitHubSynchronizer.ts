/**
 * GitHub Data Synchronizer
 * Fetches GitHub data and stores it in local database
 */

import { GitHubRateLimitError } from '../../domain/errors';
import type { CommitFile } from '../../domain/models';
import { isMergeCommit, isSquashMergeCommit } from '../../domain/models/Commit';
import type { CommentRepository } from '../storage/repositories/CommentRepository';
import type { CommitFileRepository } from '../storage/repositories/CommitFileRepository';
import type { CommitRepository } from '../storage/repositories/CommitRepository';
import type { PRRepository } from '../storage/repositories/PRRepository';
import type { RepositoryMetadataRepository } from '../storage/repositories/RepositoryMetadataRepository';
import type { ReviewRepository } from '../storage/repositories/ReviewRepository';
import type { DailySyncMetadataRepository } from '../storage/repositories/DailySyncMetadataRepository';
import type { GitHubClient } from './GitHubClient';
import { mapComment, mapCommit, mapPullRequest, mapReview } from './mappers';
import { formatDateKey, getDateRangeDays, batchIntoDayRanges } from '../../domain/utils/dateRange';

/**
 * Sync options
 */
export interface SyncOptions {
  /** Repository name (optional - if not provided, syncs all repos) */
  repo?: string;
  /** Repositories to exclude from sync */
  excludeRepos?: string[];
  /** Start date for sync */
  startDate: Date;
  /** End date for sync */
  endDate: Date;
  /** Force resync even if already synced */
  force?: boolean;
  /** Show progress indicators */
  verbose?: boolean;
  /** Skip quota pre-check (sync repo even with low remaining quota) */
  skipQuotaCheck?: boolean;
}

/**
 * Sync result summary
 */
export interface SyncSummary {
  /** Number of repositories synced */
  repoCount: number;
  /** Number of repositories skipped (inactive) */
  reposSkipped: number;
  /** Number of PRs fetched */
  prsFetched: number;
  /** Number of PRs skipped (already synced) */
  prsSkipped: number;
  /** Number of reviews fetched */
  reviewsFetched: number;
  /** Number of comments fetched */
  commentsFetched: number;
  /** Number of commits fetched */
  commitsFetched: number;
  /** Sync duration in milliseconds */
  durationMs: number;
  /** Errors encountered */
  errors: string[];
  /** Number of days synced (per-day tracking) */
  daysSynced: number;
  /** Number of days skipped (already synced) */
  daysSkipped: number;
}

/**
 * Progress callback
 */
export type ProgressCallback = (message: string) => void;

/**
 * GitHub Data Synchronizer
 */
export class GitHubSynchronizer {
  constructor(
    private githubClient: GitHubClient,
    private prRepository: PRRepository,
    private reviewRepository: ReviewRepository,
    private commentRepository: CommentRepository,
    private commitRepository: CommitRepository,
    private commitFileRepository: CommitFileRepository,
    private repoMetadataRepository: RepositoryMetadataRepository,
    private dailySyncMetadataRepository: DailySyncMetadataRepository
  ) {}

  /**
   * Sync GitHub data for specified options
   */
  async sync(options: SyncOptions, onProgress?: ProgressCallback): Promise<SyncSummary> {
    const startTime = Date.now();
    const summary: SyncSummary = {
      repoCount: 0,
      reposSkipped: 0,
      prsFetched: 0,
      prsSkipped: 0,
      reviewsFetched: 0,
      commentsFetched: 0,
      commitsFetched: 0,
      durationMs: 0,
      errors: [],
      daysSynced: 0,
      daysSkipped: 0,
    };

    try {
      // Check rate limit at start
      const initialRateLimit = await this.githubClient.checkRateLimit();
      const resetTime = new Date(initialRateLimit.reset * 1000);
      const resetIn = Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60); // minutes

      const startDateStr = options.startDate.toISOString().split('T')[0];
      const endDateStr = options.endDate.toISOString().split('T')[0];
      onProgress?.(`Date range: ${startDateStr} to ${endDateStr}`);
      onProgress?.(
        `GitHub API: ${initialRateLimit.remaining}/${initialRateLimit.limit} requests remaining (resets in ${resetIn} min)`
      );

      // Pre-compute allDays once (not per-repo)
      const allDays = getDateRangeDays(options.startDate, options.endDate);

      if (options.repo) {
        // Sync specific repository
        onProgress?.(`Syncing repository: ${options.repo}`);
        await this.syncSingleRepository(options.repo, options, allDays, summary, onProgress);
      } else {
        // Sync all repositories
        onProgress?.(`Fetching repositories from organization...`);
        const repos = await this.githubClient.fetchRepositories();

        // Filter out archived, disabled, inactive, and excluded repos
        const activeRepos = repos.filter((repo) => {
          // Skip explicitly excluded repos
          if (options.excludeRepos && options.excludeRepos.includes(repo.name)) {
            summary.reposSkipped++;
            return false;
          }

          // Skip archived/disabled
          if (repo.archived || repo.disabled) {
            return false;
          }

          // Skip repos with no recent activity
          if (repo.pushed_at) {
            const lastPush = new Date(repo.pushed_at);
            if (lastPush < options.startDate) {
              summary.reposSkipped++;
              return false;
            }
          }

          return true;
        });

        const totalFiltered = repos.length - activeRepos.length;
        onProgress?.(`Found ${repos.length} repositories`);

        // Build filter reason message
        const filterReasons: string[] = [];
        if (options.excludeRepos && options.excludeRepos.length > 0) {
          filterReasons.push(`${options.excludeRepos.length} excluded`);
        }
        filterReasons.push(
          `inactive/archived (no activity since ${options.startDate.toISOString().split('T')[0]})`
        );

        onProgress?.(`Filtered: ${totalFiltered} (${filterReasons.join(', ')})`);
        onProgress?.(`Syncing: ${activeRepos.length} active repositories`);

        // Sync each repository
        for (const [index, repo] of activeRepos.entries()) {
          onProgress?.(`\n[${index + 1}/${activeRepos.length}] Syncing ${repo.name}...`);

          try {
            await this.syncSingleRepository(repo.name, options, allDays, summary, onProgress);
          } catch (error) {
            // Check if it's a rate limit error - if so, stop immediately
            if (error instanceof GitHubRateLimitError) {
              const now = new Date();
              const minutesUntilReset = Math.ceil(
                (error.resetTime.getTime() - now.getTime()) / (60 * 1000)
              );

              onProgress?.(`\n⛔ GitHub API rate limit exceeded!`);
              onProgress?.(`   Quota resets at: ${error.resetTime.toLocaleString()}`);
              onProgress?.(`   Time until reset: ${minutesUntilReset} minutes`);
              onProgress?.(
                `\n💡 Resume sync by running the same command in ${minutesUntilReset} minutes:`
              );
              onProgress?.(`   The sync will automatically skip already-synced repositories.`);

              summary.errors.push(
                `Rate limit exceeded. ${activeRepos.length - index} repositories remaining.`
              );

              // Break out of the loop - stop syncing
              break;
            }

            // For other errors, log and continue
            const errorMsg = `${repo.name}: ${error instanceof Error ? error.message : String(error)}`;
            summary.errors.push(errorMsg);
            onProgress?.(`  ✗ Error syncing ${repo.name}: ${errorMsg}`);
            // Continue with next repo
          }
        }
      }

      // Show final rate limit
      const finalRateLimit = await this.githubClient.checkRateLimit();
      const requestsUsed = initialRateLimit.remaining - finalRateLimit.remaining;
      onProgress?.(
        `\nAPI usage: ${requestsUsed} requests used, ${finalRateLimit.remaining} remaining`
      );

      summary.durationMs = Date.now() - startTime;
      return summary;
    } catch (error) {
      summary.errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      summary.durationMs = Date.now() - startTime;
      return summary;
    }
  }

  /**
   * Sync a single repository using per-day tracking
   */
  private async syncSingleRepository(
    repo: string,
    options: SyncOptions,
    allDays: string[],
    summary: SyncSummary,
    onProgress?: ProgressCallback
  ): Promise<void> {
    summary.repoCount++;

    const org = this.githubClient.getOrganization();
    const startKey = formatDateKey(options.startDate);
    const endKey = formatDateKey(options.endDate);

    // Compute days to sync using per-day tracking
    const daysToSync: string[] = [];
    const daysSkipped: string[] = [];

    if (options.force) {
      // Force mode: sync all days
      daysToSync.push(...allDays);
    } else {
      // Check which days are already synced
      const syncedDays = new Set(
        this.dailySyncMetadataRepository.getSyncedDays('pull_requests', org, repo, startKey, endKey)
      );

      // Single-pass partition instead of two filter calls
      for (const day of allDays) {
        if (syncedDays.has(day)) {
          daysSkipped.push(day);
        } else {
          daysToSync.push(day);
        }
      }

      if (daysToSync.length === 0) {
        onProgress?.(
          `  ⏭️  ${repo}: all ${allDays.length} days already synced. Use --force to resync.`
        );
        summary.daysSkipped += daysSkipped.length;
        return;
      }

      if (daysSkipped.length > 0) {
        onProgress?.(
          `  📅 ${repo}: ${daysToSync.length} days to sync (${daysSkipped.length} already synced)`
        );
        summary.daysSkipped += daysSkipped.length;
      }
    }

    // Batch days into contiguous ranges for efficient API calls
    const ranges = batchIntoDayRanges(daysToSync);

    // Use the first range's start as the effective fetch start
    const firstRange = ranges[0];
    const fetchStartDate = firstRange ? firstRange.start : options.startDate;

    // Skip quota check if user explicitly specified a single repo or used --skip-quota-check
    const skipQuotaCheck = !!options.repo || !!options.skipQuotaCheck;

    if (!skipQuotaCheck) {
      // Check if we have enough quota to sync this repo (after cache detection)
      const quota = await this.githubClient.checkRateLimit();
      const CALLS_PER_PR = 6; // 1 for PR details, 1 for reviews, 2 for comments, 1 for PR commits, 1 buffer
      const SAFETY_MARGIN = 50; // Keep 50 calls as safety buffer

      // Estimate based on days to sync - assume ~15 PRs updated per day
      const estimatedPRs = Math.max(10, 15 * daysToSync.length);
      const estimatedCalls = Math.ceil(estimatedPRs / 100) + estimatedPRs * CALLS_PER_PR;

      if (quota.remaining < estimatedCalls + SAFETY_MARGIN) {
        onProgress?.(
          `  ⏭️  ${repo}: ~${estimatedPRs} PRs (~${estimatedCalls} API calls needed) - insufficient quota (${quota.remaining} remaining), skipping`
        );
        summary.reposSkipped++;
        return;
      }

      onProgress?.(
        `     💡 Estimated API calls: ~${estimatedCalls} (~${estimatedPRs} PRs × ${CALLS_PER_PR} calls/PR)`
      );
    }

    // Fetch PRs
    onProgress?.(`  Fetching pull requests...`);
    const githubPRs = await this.githubClient.fetchPullRequests({
      repo,
      state: 'all',
      since: fetchStartDate,
    });

    onProgress?.(`  Found ${githubPRs.length} pull requests`);

    let repoStats = {
      prsFetched: 0,
      reviewsFetched: 0,
      commentsFetched: 0,
      commitsFetched: 0,
    };

    // Track which days actually had data processed (for atomic sync tracking)
    const daysWithProcessedData = new Set<string>();
    // Track errors that occurred during this repo's sync (for atomic marking)
    const initialErrorCount = summary.errors.length;

    // Helper to check if a date falls within range
    const isInRange = (dateStr: string | null): boolean => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= options.startDate && date <= options.endDate;
    };

    // Filter PRs: include if created_at OR merged_at OR closed_at falls within range
    const filteredPRs = githubPRs.filter((pr) => {
      return isInRange(pr.created_at) || isInRange(pr.merged_at) || isInRange(pr.closed_at);
    });

    // Dedupe by PR ID (in case of duplicates from pagination)
    const seenIds = new Set<number>();
    const dedupedPRs = filteredPRs.filter((pr) => {
      if (seenIds.has(pr.id)) return false;
      seenIds.add(pr.id);
      return true;
    });

    const skippedCount = githubPRs.length - dedupedPRs.length;
    if (skippedCount > 0) {
      onProgress?.(
        `  Filtered to ${dedupedPRs.length} PRs in date range (${skippedCount} outside range)`
      );
    }

    // Process each PR
    for (const [index, githubPR] of dedupedPRs.entries()) {
      try {
        onProgress?.(
          `  [${index + 1}/${dedupedPRs.length}] Processing PR #${githubPR.number}: ${githubPR.title}`
        );

        // Fetch full PR details (list endpoint doesn't include additions/deletions/etc.)
        onProgress?.(`    Fetching full PR details...`);
        const fullPR = await this.githubClient.fetchPullRequest(repo, githubPR.number);

        // Convert and save PR
        const domainPR = mapPullRequest(fullPR);
        this.prRepository.save(domainPR);
        summary.prsFetched++;
        repoStats.prsFetched++;

        // Track which days this PR belongs to (for atomic sync tracking)
        const prDates = [fullPR.created_at, fullPR.merged_at, fullPR.closed_at].filter(Boolean);
        for (const dateStr of prDates) {
          if (dateStr && isInRange(dateStr)) {
            const dayKey = formatDateKey(new Date(dateStr));
            if (daysToSync.includes(dayKey)) {
              daysWithProcessedData.add(dayKey);
            }
          }
        }

        // Fetch and save reviews
        onProgress?.(`    Fetching reviews...`);
        const githubReviews = await this.githubClient.fetchReviews(repo, githubPR.number);

        // Filter out PENDING reviews (drafts that haven't been submitted yet)
        // PENDING reviews have no submitted_at date and aren't real reviews yet
        const submittedReviews = githubReviews.filter((review) => review.state !== 'PENDING');

        for (const githubReview of submittedReviews) {
          const domainReview = mapReview(githubReview, githubPR.id, repo);
          this.reviewRepository.save(domainReview);
          summary.reviewsFetched++;
          repoStats.reviewsFetched++;
        }

        // Fetch and save issue comments
        onProgress?.(`    Fetching comments...`);
        const issueComments = await this.githubClient.fetchIssueComments(repo, githubPR.number);
        const reviewComments = await this.githubClient.fetchReviewComments(repo, githubPR.number);

        for (const issueComment of issueComments) {
          const domainComment = mapComment(issueComment, githubPR.id, repo, 'issue_comment');
          this.commentRepository.save(domainComment);
          summary.commentsFetched++;
          repoStats.commentsFetched++;
        }

        for (const reviewComment of reviewComments) {
          const domainComment = mapComment(reviewComment, githubPR.id, repo, 'review_comment');
          this.commentRepository.save(domainComment);
          summary.commentsFetched++;
          repoStats.commentsFetched++;
        }

        // Fetch and save PR commits
        onProgress?.(`    Fetching PR commits...`);
        const prCommits = await this.githubClient.fetchPRCommits(repo, githubPR.number);
        let prCommitCount = 0;

        for (const githubCommit of prCommits) {
          // Skip commits without author (system commits)
          if (!githubCommit.author?.login) {
            continue;
          }

          const commit = mapCommit(githubCommit, repo, githubPR.id);
          this.commitRepository.save(commit);
          prCommitCount++;
        }

        const totalComments = issueComments.length + reviewComments.length;
        onProgress?.(
          `    ✓ PR #${githubPR.number}: ${githubReviews.length} reviews, ${totalComments} comments, ${prCommitCount} commits`
        );
      } catch (error) {
        const errorMsg = `PR #${githubPR.number}: ${error instanceof Error ? error.message : String(error)}`;
        summary.errors.push(`${repo}/${errorMsg}`);
        onProgress?.(`    ✗ ${errorMsg}`);
      }
    }

    // Sync commits from default branch
    try {
      onProgress?.(`  Syncing commits from default branch...`);
      const commitCount = await this.syncCommits(repo, options, onProgress);
      summary.commitsFetched += commitCount;
      repoStats.commitsFetched = commitCount;
      onProgress?.(`  ✓ ${commitCount} commits fetched`);
    } catch (error) {
      const errorMsg = `Commits: ${error instanceof Error ? error.message : String(error)}`;
      summary.errors.push(`${repo}/${errorMsg}`);
      onProgress?.(`  ✗ ${errorMsg}`);
    }

    // Update per-day sync metadata (only mark days that were actually processed)
    {
      const hadErrors = summary.errors.length > initialErrorCount;
      const now = new Date();

      // Determine which days to mark as synced:
      // - If no errors: mark all requested days (successful complete sync)
      // - If errors: only mark days that had data successfully processed
      const daysToMark = hadErrors
        ? daysToSync.filter((day) => daysWithProcessedData.has(day))
        : daysToSync;

      if (daysToMark.length > 0) {
        const dailyRecords = daysToMark.map((syncDate) => ({
          resourceType: 'pull_requests' as const,
          organization: org,
          repository: repo,
          syncDate,
          syncedAt: now,
          itemsSynced: 0,
        }));
        this.dailySyncMetadataRepository.saveBatch(dailyRecords);
        summary.daysSynced += daysToMark.length;
      }

      if (hadErrors && daysToMark.length < daysToSync.length) {
        const unmarkedCount = daysToSync.length - daysToMark.length;
        onProgress?.(
          `  ⚠️  ${unmarkedCount} days NOT marked as synced due to errors (will retry on next sync)`
        );
      }
    }

    onProgress?.(
      `  ✓ ${repo}: ${repoStats.prsFetched} PRs, ${repoStats.reviewsFetched} reviews, ${repoStats.commentsFetched} comments, ${repoStats.commitsFetched} commits`
    );
    const daysMarkedCount =
      summary.errors.length > initialErrorCount
        ? daysToSync.filter((day) => daysWithProcessedData.has(day)).length
        : daysToSync.length;
    if (daysMarkedCount > 0) {
      onProgress?.(`     📅 ${daysMarkedCount} days marked as synced`);
    }

    // Show remaining quota after each repo
    const currentQuota = await this.githubClient.checkRateLimit();
    onProgress?.(
      `     💾 Quota: ${currentQuota.remaining}/${currentQuota.limit} remaining (resets at ${new Date(currentQuota.reset * 1000).toLocaleTimeString()})`
    );
  }

  /**
   * Format sync summary as human-readable string
   */
  formatSummary(summary: SyncSummary): string {
    const lines: string[] = [
      '',
      '═══════════════════════════════════════',
      '          SYNC SUMMARY',
      '═══════════════════════════════════════',
      '',
      `📊 Repositories synced:    ${summary.repoCount}`,
      `⏭️  Repositories skipped:   ${summary.reposSkipped} (inactive)`,
      `📅 Days synced:            ${summary.daysSynced}`,
      `⏭️  Days skipped:           ${summary.daysSkipped} (already synced)`,
      `📋 Pull requests fetched:  ${summary.prsFetched}`,
      `⏭️  Pull requests skipped:  ${summary.prsSkipped}`,
      `👀 Reviews fetched:        ${summary.reviewsFetched}`,
      `💬 Comments fetched:       ${summary.commentsFetched}`,
      `💾 Commits fetched:        ${summary.commitsFetched}`,
      `⏱️  Duration:               ${(summary.durationMs / 1000).toFixed(2)}s`,
      '',
    ];

    if (summary.errors.length > 0) {
      lines.push('❌ Errors:');
      for (const error of summary.errors) {
        lines.push(`   ${error}`);
      }
      lines.push('');
    } else {
      lines.push('✅ Sync completed successfully!');
      lines.push('');
    }

    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Sync commits from default branch
   */
  private async syncCommits(
    repo: string,
    options: SyncOptions,
    onProgress?: ProgressCallback
  ): Promise<number> {
    // Get default branch (cached or fetch)
    const defaultBranch = await this.getDefaultBranch(repo, onProgress);

    // Fetch commits from default branch
    const githubCommits = await this.githubClient.fetchCommits(repo, defaultBranch, {
      since: options.startDate,
      until: options.endDate,
    });

    // Filter to direct commits that need detailed stats
    const directCommits = githubCommits.filter((c) => {
      const commit = mapCommit(c, repo);
      return !isMergeCommit(commit) && !isSquashMergeCommit(commit);
    });

    onProgress?.(
      `  Fetching details for ${directCommits.length} direct commits (${githubCommits.length} total)...`
    );

    // Fetch full details for direct commits in batches
    const BATCH_SIZE = 15;
    const detailedCommits = new Map<string, (typeof githubCommits)[0]>();

    for (let i = 0; i < directCommits.length; i += BATCH_SIZE) {
      const batch = directCommits.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((c) => this.githubClient.fetchCommitDetails(repo, c.sha));

      const results = await Promise.all(batchPromises);
      results.forEach((detailed) => {
        detailedCommits.set(detailed.sha, detailed);
      });

      // Progress update
      const processed = Math.min(i + BATCH_SIZE, directCommits.length);
      const percentage = Math.round((processed / directCommits.length) * 100);
      onProgress?.(
        `  Fetched commit details: ${processed}/${directCommits.length} (${percentage}%)`
      );
    }

    // Save commits and their file changes to database
    for (const githubCommit of githubCommits) {
      // Skip commits without author (system commits)
      if (!githubCommit.author?.login) {
        continue;
      }

      // Use detailed version if available, otherwise use list version
      const commitData = detailedCommits.get(githubCommit.sha) || githubCommit;
      const commit = mapCommit(commitData, repo);
      this.commitRepository.save(commit);

      // Save file changes if available
      if (commitData.files && commitData.files.length > 0) {
        const commitFiles: CommitFile[] = commitData.files.map((file) => ({
          commitSha: commitData.sha,
          repository: repo,
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
        }));

        this.commitFileRepository.saveBatch(commitFiles);
      }
    }

    return githubCommits.length;
  }

  /**
   * Get default branch for a repository (with caching)
   */
  private async getDefaultBranch(repo: string, onProgress?: ProgressCallback): Promise<string> {
    // Check cache
    const cached = this.repoMetadataRepository.getDefaultBranch(repo);
    const isStale = this.repoMetadataRepository.isCacheStale(repo);

    if (cached && !isStale) {
      onProgress?.(`    Using cached default branch: ${cached}`);
      return cached;
    }

    // Fetch from GitHub
    onProgress?.(`    Fetching default branch from GitHub...`);
    const repoInfo = await this.githubClient.fetchRepositoryInfo(repo);

    // Update cache
    this.repoMetadataRepository.updateDefaultBranch(repo, repoInfo.default_branch);
    onProgress?.(`    Default branch: ${repoInfo.default_branch} (cached for 7 days)`);

    return repoInfo.default_branch;
  }
}
