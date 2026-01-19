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
import type { SyncMetadataRepository } from '../storage/repositories/SyncMetadataRepository';
import type { GitHubClient } from './GitHubClient';
import { mapComment, mapCommit, mapPullRequest, mapReview } from './mappers';

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
    private syncMetadataRepository: SyncMetadataRepository,
    private commitRepository: CommitRepository,
    private commitFileRepository: CommitFileRepository,
    private repoMetadataRepository: RepositoryMetadataRepository
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

      if (options.repo) {
        // Sync specific repository
        onProgress?.(`Syncing repository: ${options.repo}`);
        await this.syncSingleRepository(options.repo, options, summary, onProgress);
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
            await this.syncSingleRepository(repo.name, options, summary, onProgress);
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
   * Sync a single repository
   */
  private async syncSingleRepository(
    repo: string,
    options: SyncOptions,
    summary: SyncSummary,
    onProgress?: ProgressCallback
  ): Promise<void> {
    summary.repoCount++;

    // Check cache and determine sync strategy
    let syncStrategy: 'full' | 'extension' | 'skip' = 'full';
    let extensionStartDate: Date | null = null;

    if (!options.force) {
      const lastSync = this.syncMetadataRepository.getLastSync(
        'pull_requests',
        this.githubClient.getOrganization(),
        repo
      );

      if (lastSync && lastSync.dateRangeStart && lastSync.dateRangeEnd) {
        // Check if previous sync fully covers the requested date range (cache hit)
        if (
          lastSync.dateRangeStart <= options.startDate &&
          lastSync.dateRangeEnd >= options.endDate
        ) {
          onProgress?.(`  ⏭️  ${repo} already synced (cached). Use --force to resync.`);
          return;
        }

        // Check if this is a cache extension
        // Conditions: startDate matches/overlaps AND endDate is extended AND ranges overlap
        if (
          lastSync.dateRangeStart <= options.startDate &&
          lastSync.dateRangeEnd < options.endDate &&
          lastSync.dateRangeEnd >= options.startDate
        ) {
          syncStrategy = 'extension';
          extensionStartDate = lastSync.dateRangeEnd;
          const cachedEnd = lastSync.dateRangeEnd.toISOString().split('T')[0];
          const newEnd = options.endDate.toISOString().split('T')[0];
          onProgress?.(
            `  🔄 Extending cache from ${cachedEnd} to ${newEnd} (fetching incremental updates)`
          );
        }
      }
    }

    // Determine the effective start date for fetching
    const fetchStartDate =
      syncStrategy === 'extension' && extensionStartDate ? extensionStartDate : options.startDate;

    // Skip quota check if user explicitly specified a single repo (they know what they're doing)
    const skipQuotaCheck = !!options.repo;

    if (!skipQuotaCheck) {
      // Check if we have enough quota to sync this repo (after cache detection)
      const quota = await this.githubClient.checkRateLimit();
      const CALLS_PER_PR = 6; // 1 for PR details, 1 for reviews, 2 for comments, 1 for PR commits, 1 buffer
      const SAFETY_MARGIN = 50; // Keep 50 calls as safety buffer
      let estimatedPRs: number;
      let estimatedCalls: number;

      if (syncStrategy === 'extension') {
        // For extensions, use fixed estimate based on days extended (no API call needed)
        const daysExtended = Math.ceil(
          (options.endDate.getTime() - (extensionStartDate?.getTime() ?? 0)) / (1000 * 60 * 60 * 24)
        );
        // Assume ~15 PRs updated per day (new PRs + PRs with new reviews/comments)
        estimatedPRs = Math.max(10, 15 * daysExtended);
        estimatedCalls = Math.ceil(estimatedPRs / 100) + estimatedPRs * CALLS_PER_PR;

        if (quota.remaining < estimatedCalls + SAFETY_MARGIN) {
          onProgress?.(
            `  ⏭️  ${repo}: ~${estimatedPRs} updated PRs (~${estimatedCalls} API calls needed) - insufficient quota (${quota.remaining} remaining), skipping for now`
          );
          summary.reposSkipped++;
          return;
        }

        onProgress?.(
          `     💡 Estimated API calls: ~${estimatedCalls} (~${estimatedPRs} updated PRs × ${CALLS_PER_PR} calls/PR)`
        );
      } else {
        // For full syncs, call countPullRequests to get accurate count
        const prCount = await this.githubClient.countPullRequests(repo, fetchStartDate);
        estimatedPRs = prCount;
        estimatedCalls = Math.ceil(prCount / 100) + prCount * CALLS_PER_PR;

        if (quota.remaining < estimatedCalls + SAFETY_MARGIN) {
          onProgress?.(
            `  ⏭️  ${repo}: ${prCount} PRs (~${estimatedCalls} API calls needed) - insufficient quota (${quota.remaining} remaining), skipping for now`
          );
          summary.reposSkipped++;
          return;
        }

        onProgress?.(
          `     💡 Estimated API calls: ~${estimatedCalls} (${prCount} PRs × ${CALLS_PER_PR} calls/PR)`
        );
      }
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

    // Update sync metadata
    this.syncMetadataRepository.save({
      resourceType: 'pull_requests',
      organization: this.githubClient.getOrganization(),
      repository: repo,
      lastSyncAt: new Date(),
      dateRangeStart: options.startDate,
      dateRangeEnd: options.endDate,
      itemsSynced: repoStats.prsFetched,
    });

    onProgress?.(
      `  ✓ ${repo}: ${repoStats.prsFetched} PRs, ${repoStats.reviewsFetched} reviews, ${repoStats.commentsFetched} comments, ${repoStats.commitsFetched} commits`
    );

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
