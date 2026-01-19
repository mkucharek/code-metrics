/**
 * GitHub API Client
 * Wrapper around Octokit with rate limiting, pagination, and error handling
 */

import { Octokit } from '@octokit/rest';
import {
  GitHubApiError,
  GitHubAuthenticationError,
  GitHubRateLimitError,
  GitHubResourceNotFoundError,
} from '../../domain/errors';
import type { GitHubConfig } from '../config/schema';
import type { Logger } from '../logging';
import {
  GitHubCommitSchema,
  GitHubPullRequestSchema,
  GitHubRateLimitResponseSchema,
  GitHubRepositorySchema,
  validateComments,
  validateCommits,
  validatePullRequests,
  validateReviews,
  type GitHubComment,
  type GitHubCommit,
  type GitHubPullRequest,
  type GitHubRateLimit,
  type GitHubRepository,
  type GitHubReview,
} from './schemas';

/**
 * Options for fetching pull requests
 */
export interface FetchPRsOptions {
  /** Repository name (without org prefix) */
  repo: string;
  /** PR state filter */
  state?: 'open' | 'closed' | 'all';
  /** Fetch PRs updated after this date (uses updated_at for broader net) */
  since?: Date;
  /** Maximum number of PRs to fetch (default: all) */
  limit?: number;
}

/**
 * GitHub API Client
 */
export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private rateLimit: GitHubRateLimit | null = null;
  private logger: Logger;

  constructor(config: GitHubConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'GitHubClient' });
    this.octokit = new Octokit({
      auth: config.token,
      userAgent: 'engineering-metrics/1.0.0',
    });
  }

  /**
   * Check and update rate limit information
   */
  async checkRateLimit(): Promise<GitHubRateLimit> {
    const response = await this.octokit.rateLimit.get();
    const validated = GitHubRateLimitResponseSchema.parse(response.data);
    this.rateLimit = validated.rate;
    return this.rateLimit;
  }

  /**
   * Wait if we're close to rate limit
   */
  private async throttleIfNeeded(): Promise<void> {
    if (!this.rateLimit) {
      await this.checkRateLimit();
    }

    if (this.rateLimit && this.rateLimit.remaining < 10) {
      const resetTime = this.rateLimit.reset * 1000; // Convert to milliseconds
      const now = Date.now();
      const waitTime = resetTime - now;

      if (waitTime > 0) {
        this.logger.warn('Rate limit low, waiting for reset', {
          remaining: this.rateLimit.remaining,
          waitSeconds: Math.ceil(waitTime / 1000),
        });
        await this.sleep(waitTime);
        await this.checkRateLimit();
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.config.rateLimit.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.throttleIfNeeded();
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check for rate limit exceeded (status 403 or 429)
        // Octokit errors have a status property
        const errorWithStatus = error as {
          status?: number;
          response?: { headers?: Record<string, string> };
        };

        if (errorWithStatus.status === 403 || errorWithStatus.status === 429) {
          // Extract reset time from headers or use current rate limit
          let resetTime: Date;

          if (errorWithStatus.response?.headers?.['x-ratelimit-reset']) {
            const resetTimestamp = parseInt(
              errorWithStatus.response.headers['x-ratelimit-reset'],
              10
            );
            resetTime = new Date(resetTimestamp * 1000);
          } else if (this.rateLimit) {
            resetTime = new Date(this.rateLimit.reset * 1000);
          } else {
            // Fallback: assume 1 hour from now
            resetTime = new Date(Date.now() + 60 * 60 * 1000);
          }

          throw new GitHubRateLimitError(resetTime);
        }

        // Convert to appropriate error type and don't retry on certain errors
        if (lastError.message.includes('Bad credentials')) {
          throw new GitHubAuthenticationError('GitHub authentication failed. Check your token.');
        }
        if (lastError.message.includes('Not Found')) {
          throw new GitHubResourceNotFoundError('resource', 'unknown', lastError.message);
        }

        if (attempt < retries) {
          const backoffTime = this.config.rateLimit.backoffMs * Math.pow(2, attempt);
          this.logger.warn('Request failed, retrying with backoff', {
            attempt: attempt + 1,
            maxAttempts: retries + 1,
            backoffMs: backoffTime,
            error: lastError.message,
          });
          await this.sleep(backoffTime);
        }
      }
    }

    this.logger.error('Request failed after all retries', lastError);
    throw new GitHubApiError(lastError?.message ?? 'Request failed after retries', 500, lastError);
  }

  /**
   * Paginate through all results
   */
  private async *paginate<T>(
    fetchPage: (page: number, perPage: number) => Promise<T[]>,
    perPage: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const results = await this.retryWithBackoff(() => fetchPage(page, perPage));

      if (results.length > 0) {
        yield results;
      }

      hasMore = results.length === perPage;
      page++;
    }
  }

  /**
   * Fetch all repositories for the organization
   */
  async fetchRepositories(): Promise<GitHubRepository[]> {
    const allRepos: GitHubRepository[] = [];

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.repos.listForOrg({
        org: this.config.organization,
        type: 'all',
        per_page: perPage,
        page,
      });

      // Validate each repo with Zod
      return response.data.map((repo) => GitHubRepositorySchema.parse(repo));
    };

    for await (const repos of this.paginate(fetchPage)) {
      allRepos.push(...repos);
    }

    return allRepos;
  }

  /**
   * Count pull requests for a repository without fetching all data
   * Uses pagination to estimate the total count
   * Filters by creation date to avoid counting the entire repo history
   */
  async countPullRequests(repo: string, since?: Date): Promise<number> {
    try {
      // Fetch PRs sorted by created date descending
      const response = await this.retryWithBackoff(() =>
        this.octokit.pulls.list({
          owner: this.config.organization,
          repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
          per_page: 100,
          page: 1,
        })
      );

      // Filter by date if provided
      let count = 0;
      const allPRs = response.data;

      for (const pr of allPRs) {
        if (since && new Date(pr.created_at) < since) {
          // Stop counting once we reach PRs older than the date
          break;
        }
        count++;
      }

      // If we got less than 100, we've counted all PRs in range
      if (allPRs.length < 100 || (since && count < allPRs.length)) {
        return count;
      }

      // Otherwise, we need to paginate to get the real count
      let hasMore = allPRs.length === 100;
      let page = 2;

      while (hasMore) {
        const nextPage = await this.retryWithBackoff(() =>
          this.octokit.pulls.list({
            owner: this.config.organization,
            repo,
            state: 'all',
            sort: 'created',
            direction: 'desc',
            per_page: 100,
            page,
          })
        );

        const prs = nextPage.data;

        for (const pr of prs) {
          if (since && new Date(pr.created_at) < since) {
            // Stop counting once we reach PRs older than the date
            return count;
          }
          count++;
        }

        hasMore = prs.length === 100;
        page++;
      }

      return count;
    } catch (error) {
      // If we can't count, return a conservative estimate
      this.logger.warn('Failed to count PRs, using fallback estimate', { repo, error });
      return 50; // Conservative fallback
    }
  }

  /**
   * Fetch a single pull request with full details
   */
  async fetchPullRequest(repo: string, prNumber: number): Promise<GitHubPullRequest> {
    const response = await this.retryWithBackoff(() =>
      this.octokit.pulls.get({
        owner: this.config.organization,
        repo,
        pull_number: prNumber,
      })
    );

    // Validate with Zod
    return GitHubPullRequestSchema.parse(response.data);
  }

  /**
   * Fetch all pull requests for a repository
   * Sorts by updated_at to catch PRs with recent activity (reviews, comments, merges)
   */
  async fetchPullRequests(options: FetchPRsOptions): Promise<GitHubPullRequest[]> {
    const allPRs: GitHubPullRequest[] = [];
    let count = 0;

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.pulls.list({
        owner: this.config.organization,
        repo: options.repo,
        state: options.state ?? 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: perPage,
        page,
      });

      // Note: pulls.list returns simplified PRs without additions/deletions/etc.
      // We'll fetch full details for each PR later
      return validatePullRequests(response.data);
    };

    for await (const prs of this.paginate(fetchPage)) {
      for (const pr of prs) {
        // Stop when PRs haven't been updated since our date range
        // (sorted by updated_at desc, so once we hit old PRs we can stop)
        if (options.since && new Date(pr.updated_at) < options.since) {
          return allPRs;
        }

        allPRs.push(pr);
        count++;

        // Stop if we've reached the limit
        if (options.limit && count >= options.limit) {
          return allPRs;
        }
      }
    }

    return allPRs;
  }

  /**
   * Fetch reviews for a specific pull request
   */
  async fetchReviews(repo: string, prNumber: number): Promise<GitHubReview[]> {
    const allReviews: GitHubReview[] = [];

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.pulls.listReviews({
        owner: this.config.organization,
        repo,
        pull_number: prNumber,
        per_page: perPage,
        page,
      });

      return validateReviews(response.data);
    };

    for await (const reviews of this.paginate(fetchPage)) {
      allReviews.push(...reviews);
    }

    return allReviews;
  }

  /**
   * Fetch comments for a specific pull request (issue comments)
   */
  async fetchIssueComments(repo: string, prNumber: number): Promise<GitHubComment[]> {
    const allComments: GitHubComment[] = [];

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.issues.listComments({
        owner: this.config.organization,
        repo,
        issue_number: prNumber,
        per_page: perPage,
        page,
      });

      return validateComments(response.data);
    };

    for await (const comments of this.paginate(fetchPage)) {
      allComments.push(...comments);
    }

    return allComments;
  }

  /**
   * Fetch review comments for a specific pull request
   */
  async fetchReviewComments(repo: string, prNumber: number): Promise<GitHubComment[]> {
    const allComments: GitHubComment[] = [];

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.pulls.listReviewComments({
        owner: this.config.organization,
        repo,
        pull_number: prNumber,
        per_page: perPage,
        page,
      });

      return validateComments(response.data);
    };

    for await (const comments of this.paginate(fetchPage)) {
      allComments.push(...comments);
    }

    return allComments;
  }

  /**
   * Fetch all comments for a pull request (both issue and review comments)
   */
  async fetchAllComments(repo: string, prNumber: number): Promise<GitHubComment[]> {
    const [issueComments, reviewComments] = await Promise.all([
      this.fetchIssueComments(repo, prNumber),
      this.fetchReviewComments(repo, prNumber),
    ]);

    return [...issueComments, ...reviewComments];
  }

  /**
   * Fetch commits for a specific pull request
   * Returns commits in the PR branch (actual commit dates, not merge date)
   */
  async fetchPRCommits(repo: string, prNumber: number): Promise<GitHubCommit[]> {
    const allCommits: GitHubCommit[] = [];

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.pulls.listCommits({
        owner: this.config.organization,
        repo,
        pull_number: prNumber,
        per_page: perPage,
        page,
      });

      return validateCommits(response.data);
    };

    for await (const commits of this.paginate(fetchPage)) {
      allCommits.push(...commits);
    }

    return allCommits;
  }

  /**
   * Fetch repository information including default branch
   */
  async fetchRepositoryInfo(repo: string): Promise<GitHubRepository> {
    await this.throttleIfNeeded();

    this.logger.debug('Fetching repository info', { repo });

    try {
      const response = await this.octokit.repos.get({
        owner: this.config.organization,
        repo,
      });

      return GitHubRepositorySchema.parse(response.data);
    } catch (error: unknown) {
      const status = (error as { status?: number }).status || 500;
      if (status === 404) {
        throw new GitHubResourceNotFoundError('repository', repo);
      }
      throw new GitHubApiError(`Failed to fetch repository ${repo}`, status, error as Error);
    }
  }

  /**
   * Fetch a single commit with full details (includes stats and files)
   */
  async fetchCommitDetails(repo: string, sha: string): Promise<GitHubCommit> {
    this.logger.debug('Fetching commit details', { repo, sha: sha.substring(0, 7) });

    const response = await this.retryWithBackoff(() =>
      this.octokit.repos.getCommit({
        owner: this.config.organization,
        repo,
        ref: sha,
      })
    );

    // Validate with Zod
    return GitHubCommitSchema.parse(response.data);
  }

  /**
   * Fetch commits from a specific branch
   */
  async fetchCommits(
    repo: string,
    branch: string,
    options: { since?: Date; until?: Date; limit?: number } = {}
  ): Promise<GitHubCommit[]> {
    const allCommits: GitHubCommit[] = [];
    let count = 0;

    const fetchPage = async (page: number, perPage: number) => {
      const response = await this.octokit.repos.listCommits({
        owner: this.config.organization,
        repo,
        sha: branch, // Filter by branch
        since: options.since?.toISOString(),
        until: options.until?.toISOString(),
        per_page: perPage,
        page,
      });

      return validateCommits(response.data);
    };

    for await (const commits of this.paginate(fetchPage)) {
      allCommits.push(...commits);
      count += commits.length;

      // Stop if we've reached the limit
      if (options.limit && count >= options.limit) {
        this.logger.debug('Reached commit limit', { repo, branch, limit: options.limit });
        return allCommits.slice(0, options.limit);
      }
    }

    this.logger.debug('Fetched commits', { repo, branch, count: allCommits.length });
    return allCommits;
  }

  /**
   * Get current rate limit status
   */
  getRateLimit(): GitHubRateLimit | null {
    return this.rateLimit;
  }

  /**
   * Get organization name
   */
  getOrganization(): string {
    return this.config.organization;
  }
}
