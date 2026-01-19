/**
 * Report Generator
 * Application service for generating metrics reports from database
 */

import type { Database } from 'better-sqlite3';
import { filterUsers } from '../domain';
import { computeEngineerMetrics, computeOrganizationMetrics } from '../domain/metrics';
import type {
  CollaborationPartner,
  Comment,
  Commit,
  CommitDetail,
  DailyContribution,
  DateRange,
  EngineerDetailReport,
  EngineerMetrics,
  OrganizationMetrics,
  PRDetail,
  PRSizeDistribution,
  PullRequest,
  RepositoryContribution,
  RepositoryHealthMetrics,
  RepositoryHealthReport,
  Review,
  SummaryStats,
  WeeklyActivity,
} from '../domain/models';
import { isMergeCommit, isSquashMergeCommit } from '../domain/models/Commit';
import type { TeamsConfig } from '../infrastructure/config/schema';
import { getEngineerTeams } from '../infrastructure/config/teams';
import {
  CommentRepository,
  CommitRepository,
  PRRepository,
  ReviewRepository,
  SyncMetadataRepository,
} from '../infrastructure/storage/repositories';

/**
 * Options for generating reports
 */
export interface ReportOptions {
  /** Organization name */
  organization: string;
  /** Date range for report */
  dateRange: DateRange;
  /** Optional: specific engineer to report on */
  engineer?: string;
  /** Optional: filter by repositories (comma-separated list) */
  repositories?: string[];
  /** Optional: include bot users (default: false) */
  includeBots?: boolean;
  /** Optional: list of users to exclude */
  excludedUsers?: string[];
  /** Optional: team configuration for cross-team analysis */
  teams?: TeamsConfig;
}

/**
 * Report Generator Service
 */
export class ReportGenerator {
  private prRepository: PRRepository;
  private reviewRepository: ReviewRepository;
  private commentRepository: CommentRepository;
  private syncMetadataRepository: SyncMetadataRepository;
  private commitRepository: CommitRepository;

  constructor(db: Database) {
    this.prRepository = new PRRepository(db);
    this.reviewRepository = new ReviewRepository(db);
    this.commentRepository = new CommentRepository(db);
    this.syncMetadataRepository = new SyncMetadataRepository(db);
    this.commitRepository = new CommitRepository(db);
  }

  /**
   * Generate organization-wide metrics report
   */
  generateOrganizationReport(options: ReportOptions): OrganizationMetrics {
    // Fetch all data from database
    const allPRs = this.prRepository.findByDateRange(options.dateRange);
    const allReviews = this.reviewRepository.findByDateRange(options.dateRange);
    const allComments = this.commentRepository.findByDateRange(options.dateRange);

    // Get list of users to exclude
    const excludedUsernames = this.getExcludedUsers(
      allPRs.map((pr) => pr.author),
      allReviews.map((review) => review.reviewer),
      allComments.map((comment) => comment.author),
      options
    );

    // Filter by repositories if specified
    let prs =
      options.repositories && options.repositories.length > 0
        ? allPRs.filter((pr) => options.repositories!.includes(pr.repository))
        : allPRs;

    let reviews =
      options.repositories && options.repositories.length > 0
        ? allReviews.filter((review) => options.repositories!.includes(review.repository))
        : allReviews;

    let comments =
      options.repositories && options.repositories.length > 0
        ? allComments.filter((comment) => options.repositories!.includes(comment.repository))
        : allComments;

    // Filter by excluded users
    if (excludedUsernames.size > 0) {
      prs = prs.filter((pr) => !excludedUsernames.has(pr.author));
      reviews = reviews.filter((review) => !excludedUsernames.has(review.reviewer));
      comments = comments.filter((comment) => !excludedUsernames.has(comment.author));
    }

    // Compute metrics using domain logic
    return computeOrganizationMetrics(
      options.organization,
      prs,
      reviews,
      comments,
      options.dateRange
    );
  }

  /**
   * Get set of users to exclude based on options
   */
  private getExcludedUsers(
    authors: string[],
    reviewers: string[],
    commenters: string[],
    options: ReportOptions
  ): Set<string> {
    // Get all unique users
    const allUsers = new Set([...authors, ...reviewers, ...commenters]);

    // Apply filters
    const filteredUsers = filterUsers(Array.from(allUsers), {
      includeBots: options.includeBots ?? false,
      excludedUsers: options.excludedUsers ?? [],
    });

    // Return users that were filtered out
    const excluded = new Set<string>();
    allUsers.forEach((user) => {
      if (!filteredUsers.includes(user)) {
        excluded.add(user);
      }
    });

    return excluded;
  }

  /**
   * Generate individual engineer metrics report
   */
  generateEngineerReport(options: ReportOptions): EngineerMetrics {
    if (!options.engineer) {
      throw new Error('Engineer name is required for engineer report');
    }

    // Fetch all data from database
    const allPRs = this.prRepository.findByDateRange(options.dateRange);
    const allReviews = this.reviewRepository.findByDateRange(options.dateRange);
    const allComments = this.commentRepository.findByDateRange(options.dateRange);

    // Filter by repositories if specified
    const prs =
      options.repositories && options.repositories.length > 0
        ? allPRs.filter((pr) => options.repositories!.includes(pr.repository))
        : allPRs;

    const reviews =
      options.repositories && options.repositories.length > 0
        ? allReviews.filter((review) => options.repositories!.includes(review.repository))
        : allReviews;

    const comments =
      options.repositories && options.repositories.length > 0
        ? allComments.filter((comment) => options.repositories!.includes(comment.repository))
        : allComments;

    // Compute metrics for specific engineer
    return computeEngineerMetrics(options.engineer, prs, reviews, comments, options.dateRange);
  }

  /**
   * Generate detailed report for a single engineer
   */
  generateEngineerDetailReport(options: ReportOptions): EngineerDetailReport {
    if (!options.engineer) {
      throw new Error('Engineer name is required for engineer detail report');
    }

    const engineer = options.engineer;

    // Fetch all data from database
    const allPRs = this.prRepository.findByDateRange(options.dateRange);
    const allReviews = this.reviewRepository.findByDateRange(options.dateRange);
    const allComments = this.commentRepository.findByDateRange(options.dateRange);
    const allCommits = this.commitRepository.findByDateRange(options.dateRange);

    // Filter by repositories if specified
    const prs =
      options.repositories && options.repositories.length > 0
        ? allPRs.filter((pr) => options.repositories!.includes(pr.repository))
        : allPRs;

    const reviews =
      options.repositories && options.repositories.length > 0
        ? allReviews.filter((review) => options.repositories!.includes(review.repository))
        : allReviews;

    const comments =
      options.repositories && options.repositories.length > 0
        ? allComments.filter((comment) => options.repositories!.includes(comment.repository))
        : allComments;

    const commits =
      options.repositories && options.repositories.length > 0
        ? allCommits.filter((commit: Commit) => options.repositories!.includes(commit.repository))
        : allCommits;

    // Filter engineer's PRs, reviews, comments, and commits
    const engineerPRs = prs.filter((pr) => pr.author === engineer);
    const engineerReviews = reviews.filter((review) => review.reviewer === engineer);
    const engineerComments = comments.filter((comment) => comment.author === engineer);
    // Exclude merge commits from contribution metrics (they inflate counts without representing actual code work)
    const engineerCommits = commits.filter(
      (commit: Commit) => commit.author === engineer && !isMergeCommit(commit)
    );

    // Compute activity metrics
    const prsOpened = engineerPRs.length;
    const mergedPRs = engineerPRs.filter((pr) => pr.state === 'merged');
    const prsMerged = mergedPRs.length;
    const prsClosed = engineerPRs.filter((pr) => pr.state === 'closed').length;

    // Only count lines from merged PRs (code that actually landed)
    const linesAdded = mergedPRs.reduce((sum, pr) => sum + pr.additions, 0);
    const linesDeleted = mergedPRs.reduce((sum, pr) => sum + pr.deletions, 0);
    const totalChurn = linesAdded + linesDeleted;
    const avgPrSize = prsMerged > 0 ? totalChurn / prsMerged : 0;
    const mergeRate = prsOpened > 0 ? (prsMerged / prsOpened) * 100 : 0;

    // PR size distribution (only merged PRs for consistency with line counts)
    const prSizeDistribution = this.computePRSizeDistribution(mergedPRs);

    // Commit metrics (exclude squash-merge commits)
    const nonSquashCommits = engineerCommits.filter((c) => !isSquashMergeCommit(c));
    const totalCommits = nonSquashCommits.length;
    const commitLinesAdded = nonSquashCommits.reduce(
      (sum: number, c: Commit) => sum + c.additions,
      0
    );
    const commitLinesDeleted = nonSquashCommits.reduce(
      (sum: number, c: Commit) => sum + c.deletions,
      0
    );
    const totalCommitChurn = commitLinesAdded + commitLinesDeleted;
    const avgCommitSize = totalCommits > 0 ? totalCommitChurn / totalCommits : 0;
    const daysInRange =
      (options.dateRange.end.getTime() - options.dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const avgCommitsPerDay = daysInRange > 0 ? totalCommits / daysInRange : 0;

    // Review activity
    const prsReviewed = new Set(engineerReviews.map((r) => r.pullRequestId)).size;
    const commentsMade = engineerComments.length;
    const avgCommentsPerReview = prsReviewed > 0 ? commentsMade / prsReviewed : 0;

    // Get team configuration (pass empty if not provided)
    const teams = options.teams || {};

    // Collaboration patterns
    const topReviewers = this.computeTopReviewers(engineerPRs, reviews, engineer, teams);
    const topReviewedEngineers = this.computeTopReviewedEngineers(
      engineer,
      engineerReviews,
      prs,
      teams
    );

    // Cross-team collaboration and review distribution
    const collaborationStats = this.computeCollaborationStats(
      engineer,
      topReviewers,
      topReviewedEngineers,
      reviews,
      engineerPRs,
      teams
    );

    // Repository contributions
    const repositories = this.computeRepositoryContributions(engineerPRs);

    // Weekly timeline
    const timeline = this.computeWeeklyTimeline(
      engineerPRs,
      engineerReviews,
      engineerComments,
      options.dateRange
    );

    // PR list
    const prList = this.computePRList(engineerPRs, reviews, comments);

    // Commits list (non-merge) - pass all PRs for PR number lookup
    const commitsList = this.computeCommitsList(engineerCommits, prs);

    // Filter PR commits (commits with pullRequestId set)
    const prCommits = engineerCommits.filter((c: Commit) => c.pullRequestId != null);

    // Contribution heatmap (PRs, reviews, comments, PR commits)
    const contributionHeatmap = this.computeContributionHeatmap(
      engineerPRs,
      engineerReviews,
      engineerComments,
      prCommits,
      options.dateRange
    );

    // Code contribution heatmap (commits only)
    const codeContributionHeatmap = this.computeCodeContributionHeatmap(
      engineerCommits,
      options.dateRange
    );

    // Code impact heatmap (line changes from PRs + commits)
    const codeImpactHeatmap = this.computeCodeImpactHeatmap(
      engineerPRs,
      engineerCommits,
      options.dateRange
    );

    // Summary stats
    const summary = this.computeSummaryStats(timeline, contributionHeatmap, prsOpened);

    // Turnaround times
    const turnaround = this.computeTurnaroundTimes(engineerPRs, reviews);

    return {
      engineer,
      organization: options.organization,
      dateRange: options.dateRange,
      summary,
      activity: {
        prsOpened,
        prsMerged,
        prsClosed,
        linesAdded,
        linesDeleted,
        totalChurn,
        avgPrSize,
        mergeRate,
        prSizeDistribution,
      },
      commits: {
        totalCommits,
        linesAdded: commitLinesAdded,
        linesDeleted: commitLinesDeleted,
        avgCommitSize,
        avgCommitsPerDay,
      },
      reviews: {
        prsReviewed,
        commentsMade,
        avgCommentsPerReview,
      },
      turnaround,
      collaboration: {
        topReviewers,
        topReviewedEngineers,
        crossTeamCollaboration: collaborationStats.crossTeamCollaboration,
        reviewDistribution: collaborationStats.reviewDistribution,
      },
      repositories,
      timeline,
      prs: prList,
      commitsList,
      contributionHeatmap,
      codeContributionHeatmap,
      codeImpactHeatmap,
    };
  }

  /**
   * Compute PR size distribution
   */
  private computePRSizeDistribution(prs: PullRequest[]): PRSizeDistribution {
    let small = 0;
    let medium = 0;
    let large = 0;

    for (const pr of prs) {
      const totalLines = pr.additions + pr.deletions;
      if (totalLines < 100) {
        small++;
      } else if (totalLines <= 500) {
        medium++;
      } else {
        large++;
      }
    }

    return { small, medium, large };
  }

  /**
   * Compute top reviewers for an engineer's PRs
   */
  private computeTopReviewers(
    engineerPRs: PullRequest[],
    allReviews: Review[],
    engineer: string,
    teams: TeamsConfig
  ): CollaborationPartner[] {
    const reviewerCounts = new Map<string, number>();
    const prIds = new Set(engineerPRs.map((pr) => pr.id));

    // Count reviews by reviewer
    for (const review of allReviews) {
      if (prIds.has(review.pullRequestId)) {
        reviewerCounts.set(review.reviewer, (reviewerCounts.get(review.reviewer) || 0) + 1);
      }
    }

    // Get engineer's teams
    const engineerTeams = getEngineerTeams(teams, engineer);

    // Sort by count and return top 5 with team info
    return Array.from(reviewerCounts.entries())
      .map(([reviewerName, count]) => {
        const reviewerTeams = getEngineerTeams(teams, reviewerName);
        const isCrossTeam =
          engineerTeams.length > 0 &&
          reviewerTeams.length > 0 &&
          !engineerTeams.some((t) => reviewerTeams.includes(t));

        return {
          engineer: reviewerName,
          count,
          isCrossTeam,
          team: reviewerTeams[0], // Primary team
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Compute top engineers that this engineer reviewed
   */
  private computeTopReviewedEngineers(
    engineer: string,
    engineerReviews: Review[],
    allPRs: PullRequest[],
    teams: TeamsConfig
  ): CollaborationPartner[] {
    const authorCounts = new Map<string, number>();
    const prMap = new Map(allPRs.map((pr) => [pr.id, pr]));

    // Count PRs reviewed by author
    for (const review of engineerReviews) {
      const pr = prMap.get(review.pullRequestId);
      if (pr && pr.author !== engineer) {
        authorCounts.set(pr.author, (authorCounts.get(pr.author) || 0) + 1);
      }
    }

    // Get engineer's teams
    const engineerTeams = getEngineerTeams(teams, engineer);

    // Sort by count and return top 5 with team info
    return Array.from(authorCounts.entries())
      .map(([authorName, count]) => {
        const authorTeams = getEngineerTeams(teams, authorName);
        const isCrossTeam =
          engineerTeams.length > 0 &&
          authorTeams.length > 0 &&
          !engineerTeams.some((t) => authorTeams.includes(t));

        return {
          engineer: authorName,
          count,
          isCrossTeam,
          team: authorTeams[0], // Primary team
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Compute collaboration statistics including cross-team and distribution metrics
   */
  private computeCollaborationStats(
    engineer: string,
    _topReviewers: CollaborationPartner[],
    _topReviewedEngineers: CollaborationPartner[],
    allReviews: Review[],
    engineerPRs: PullRequest[],
    teams: TeamsConfig
  ): {
    crossTeamCollaboration: number;
    reviewDistribution: { totalReviewers: number; reviewConcentration: number };
  } {
    const prIds = new Set(engineerPRs.map((pr) => pr.id));

    // Get all reviewers for engineer's PRs
    const reviewerCounts = new Map<string, number>();
    for (const review of allReviews) {
      if (prIds.has(review.pullRequestId)) {
        reviewerCounts.set(review.reviewer, (reviewerCounts.get(review.reviewer) || 0) + 1);
      }
    }

    const totalReviews = Array.from(reviewerCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalReviewers = reviewerCounts.size;

    // Calculate cross-team collaboration percentage
    const engineerTeams = getEngineerTeams(teams, engineer);
    let crossTeamReviews = 0;

    if (engineerTeams.length > 0) {
      for (const [reviewer] of reviewerCounts) {
        const reviewerTeams = getEngineerTeams(teams, reviewer);
        if (reviewerTeams.length > 0 && !engineerTeams.some((t) => reviewerTeams.includes(t))) {
          crossTeamReviews += reviewerCounts.get(reviewer) || 0;
        }
      }
    }

    const crossTeamCollaboration =
      totalReviews > 0 ? Math.round((crossTeamReviews / totalReviews) * 100) : 0;

    // Calculate review concentration (top 3 reviewers)
    const sortedCounts = Array.from(reviewerCounts.values()).sort((a, b) => b - a);
    const top3Total = sortedCounts.slice(0, 3).reduce((sum, count) => sum + count, 0);
    const reviewConcentration = totalReviews > 0 ? Math.round((top3Total / totalReviews) * 100) : 0;

    return {
      crossTeamCollaboration,
      reviewDistribution: {
        totalReviewers,
        reviewConcentration,
      },
    };
  }

  /**
   * Compute repository contributions breakdown
   * Only counts lines from merged PRs (code that actually landed)
   */
  private computeRepositoryContributions(prs: PullRequest[]): RepositoryContribution[] {
    const repoMap = new Map<
      string,
      { prCount: number; linesAdded: number; linesDeleted: number }
    >();

    for (const pr of prs) {
      const existing = repoMap.get(pr.repository) || {
        prCount: 0,
        linesAdded: 0,
        linesDeleted: 0,
      };

      // Count all PRs, but only count lines from merged PRs
      const prCount = existing.prCount + 1;
      const linesAdded =
        pr.state === 'merged' ? existing.linesAdded + pr.additions : existing.linesAdded;
      const linesDeleted =
        pr.state === 'merged' ? existing.linesDeleted + pr.deletions : existing.linesDeleted;

      repoMap.set(pr.repository, {
        prCount,
        linesAdded,
        linesDeleted,
      });
    }

    // Sort by PR count and return
    return Array.from(repoMap.entries())
      .map(([repository, stats]) => ({ repository, ...stats }))
      .sort((a, b) => b.prCount - a.prCount);
  }

  /**
   * Compute weekly activity timeline
   */
  private computeWeeklyTimeline(
    prs: PullRequest[],
    reviews: Review[],
    comments: Comment[],
    dateRange: DateRange
  ): WeeklyActivity[] {
    const weekMap = new Map<string, WeeklyActivity>();

    // Helper to get ISO week number (W01, W25, etc.)
    const getISOWeekNumber = (date: Date): string => {
      const d = new Date(date);
      // Set to nearest Thursday (current date + 4 - current day of week)
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      // Get first day of year
      const yearStart = new Date(d.getFullYear(), 0, 1);
      // Calculate full weeks to nearest Thursday
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `W${weekNo.toString().padStart(2, '0')}`;
    };

    // Helper to get week start (Monday)
    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0]!;
    };

    // Initialize weeks in range
    const currentWeek = new Date(dateRange.start);
    while (currentWeek <= dateRange.end) {
      const weekStart = getWeekStart(currentWeek);
      if (!weekMap.has(weekStart)) {
        const weekStartDate = new Date(weekStart);
        weekMap.set(weekStart, {
          weekNumber: getISOWeekNumber(weekStartDate),
          weekStart,
          prsOpened: 0,
          prsMerged: 0,
          reviewsGiven: 0,
          commentsWritten: 0,
          avgPrSize: 0,
          smallPRs: 0,
          mediumPRs: 0,
          largePRs: 0,
        });
      }
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    // Count PRs by week and track sizes
    const weekSizes = new Map<string, number[]>();
    for (const pr of prs) {
      const weekStart = getWeekStart(pr.createdAt);
      const week = weekMap.get(weekStart);
      if (week) {
        week.prsOpened++;
        if (pr.state === 'merged') week.prsMerged++;

        // Track PR size
        const prSize = pr.additions + pr.deletions;
        const sizes = weekSizes.get(weekStart) || [];
        sizes.push(prSize);
        weekSizes.set(weekStart, sizes);

        // Categorize by size
        if (prSize < 100) {
          week.smallPRs++;
        } else if (prSize <= 500) {
          week.mediumPRs++;
        } else {
          week.largePRs++;
        }
      }
    }

    // Calculate average PR size per week
    for (const [weekStart, sizes] of weekSizes.entries()) {
      const week = weekMap.get(weekStart);
      if (week && sizes.length > 0) {
        week.avgPrSize = Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length);
      }
    }

    // Count reviews by week
    for (const review of reviews) {
      const weekStart = getWeekStart(review.submittedAt);
      const week = weekMap.get(weekStart);
      if (week) week.reviewsGiven++;
    }

    // Count comments by week
    for (const comment of comments) {
      const weekStart = getWeekStart(comment.createdAt);
      const week = weekMap.get(weekStart);
      if (week) week.commentsWritten++;
    }

    // Return sorted by week
    return Array.from(weekMap.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  /**
   * Compute PR list with detailed information
   */
  private computePRList(
    prs: PullRequest[],
    allReviews: Review[],
    allComments: Comment[]
  ): PRDetail[] {
    // Helper to get ISO week number
    const getISOWeekNumber = (date: Date): string => {
      const d = new Date(date);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `W${weekNo.toString().padStart(2, '0')}`;
    };

    // Helper to calculate time to merge
    const calculateTimeToMerge = (pr: PullRequest): string => {
      if (pr.state !== 'merged' || !pr.mergedAt) {
        return 'N/A';
      }

      const diffMs = pr.mergedAt.getTime() - pr.createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffDays >= 1) {
        return `${Math.round(diffDays)}d`;
      } else {
        return `${Math.round(diffHours)}h`;
      }
    };

    // Helper to truncate title
    const truncateTitle = (title: string, maxLength: number = 60): string => {
      if (title.length <= maxLength) {
        return title;
      }
      return title.substring(0, maxLength - 3) + '...';
    };

    // Map PR IDs to reviews and comments counts
    const reviewCounts = new Map<number, number>();
    const commentCounts = new Map<number, number>();

    for (const review of allReviews) {
      reviewCounts.set(review.pullRequestId, (reviewCounts.get(review.pullRequestId) || 0) + 1);
    }

    for (const comment of allComments) {
      commentCounts.set(comment.pullRequestId, (commentCounts.get(comment.pullRequestId) || 0) + 1);
    }

    // Build PR details
    const prDetails: PRDetail[] = prs.map((pr) => ({
      weekNumber: getISOWeekNumber(pr.createdAt),
      repository: pr.repository,
      prNumber: pr.number,
      title: truncateTitle(pr.title),
      status: pr.state,
      linesAdded: pr.additions,
      linesDeleted: pr.deletions,
      reviews: reviewCounts.get(pr.id) || 0,
      comments: commentCounts.get(pr.id) || 0,
      timeToMerge: calculateTimeToMerge(pr),
      changedFiles: pr.changedFiles,
      commits: pr.commitCount,
      createdAt: pr.createdAt,
    }));

    // Sort by created date (chronological)
    return prDetails.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Compute commits list (non-merge commits)
   */
  private computeCommitsList(commits: Commit[], allPRs: PullRequest[]): CommitDetail[] {
    const commitDetails: CommitDetail[] = [];

    // Create a map of PR ID to PR number for quick lookup
    const prIdToNumber = new Map<number, number>();
    for (const pr of allPRs) {
      prIdToNumber.set(pr.id, pr.number);
    }

    for (const commit of commits) {
      // Skip merge commits and squash-merge commits (already represented in PRs)
      if (isMergeCommit(commit) || isSquashMergeCommit(commit)) {
        continue;
      }

      const commitDate = new Date(commit.committedAt);
      const dateStr = commitDate.toISOString().split('T')[0];

      // Look up PR number from pullRequestId
      const prNumber = commit.pullRequestId ? prIdToNumber.get(commit.pullRequestId) : null;

      commitDetails.push({
        date: dateStr || '', // YYYY-MM-DD
        sha: commit.sha.substring(0, 7), // Short SHA for display
        fullSha: commit.sha, // Full SHA for GitHub link
        message: commit.message,
        repository: commit.repository,
        additions: commit.additions,
        deletions: commit.deletions,
        prNumber: prNumber ?? null,
      });
    }

    // Sort by date (newest first)
    commitDetails.sort((a, b) => b.date.localeCompare(a.date));

    return commitDetails;
  }

  /**
   * Compute contribution heatmap with daily activity levels
   * Includes PRs, reviews, comments, and PR commits
   */
  private computeContributionHeatmap(
    prs: PullRequest[],
    reviews: Review[],
    comments: Comment[],
    prCommits: Commit[],
    dateRange: DateRange
  ): DailyContribution[] {
    const dailyContributions = new Map<string, number>();

    // Helper to get date string
    const getDateString = (date: Date): string => {
      return date.toISOString().split('T')[0]!;
    };

    // Helper to get contribution level
    const getLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
      if (count === 0) return 0;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 10) return 3;
      return 4;
    };

    // Initialize all dates in range with 0
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      const dateStr = getDateString(currentDate);
      dailyContributions.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count PR openings
    for (const pr of prs) {
      const dateStr = getDateString(pr.createdAt);
      if (dailyContributions.has(dateStr)) {
        dailyContributions.set(dateStr, dailyContributions.get(dateStr)! + 1);
      }
    }

    // Count PR merges (on merge date, not creation date)
    for (const pr of prs) {
      if (pr.state === 'merged' && pr.mergedAt) {
        const dateStr = getDateString(pr.mergedAt);
        if (dailyContributions.has(dateStr)) {
          dailyContributions.set(dateStr, dailyContributions.get(dateStr)! + 1);
        }
      }
    }

    // Count reviews
    for (const review of reviews) {
      const dateStr = getDateString(review.submittedAt);
      if (dailyContributions.has(dateStr)) {
        dailyContributions.set(dateStr, dailyContributions.get(dateStr)! + 1);
      }
    }

    // Count comments
    for (const comment of comments) {
      const dateStr = getDateString(comment.createdAt);
      if (dailyContributions.has(dateStr)) {
        dailyContributions.set(dateStr, dailyContributions.get(dateStr)! + 1);
      }
    }

    // Count PR commits (commits made within PRs)
    for (const commit of prCommits) {
      const dateStr = getDateString(commit.committedAt);
      if (dailyContributions.has(dateStr)) {
        dailyContributions.set(dateStr, dailyContributions.get(dateStr)! + 1);
      }
    }

    // Convert to array with levels
    return Array.from(dailyContributions.entries())
      .map(([date, count]) => ({
        date,
        count,
        level: getLevel(count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Compute summary statistics for quick overview
   */
  private computeSummaryStats(
    timeline: WeeklyActivity[],
    heatmap: DailyContribution[],
    totalPRs: number
  ): SummaryStats {
    // Calculate total weeks
    const totalWeeks = timeline.length;

    // Calculate avg PRs per week
    const avgPRsPerWeek = totalWeeks > 0 ? totalPRs / totalWeeks : 0;

    // Find most productive day of week
    const dayContributions = new Map<number, number>();
    heatmap.forEach((contribution) => {
      const date = new Date(contribution.date);
      const dayOfWeek = date.getDay();
      dayContributions.set(dayOfWeek, (dayContributions.get(dayOfWeek) || 0) + contribution.count);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let mostProductiveDay = 'N/A';
    let maxDayContributions = 0;

    dayContributions.forEach((count, day) => {
      if (count > maxDayContributions) {
        maxDayContributions = count;
        mostProductiveDay = dayNames[day] || 'N/A';
      }
    });

    // Find busiest week
    let busiestWeek = 'N/A';
    let maxWeekActivity = 0;

    timeline.forEach((week) => {
      const weekActivity = week.prsOpened + week.reviewsGiven + week.commentsWritten;
      if (weekActivity > maxWeekActivity) {
        maxWeekActivity = weekActivity;
        busiestWeek = week.weekNumber;
      }
    });

    // Count active days (days with at least 1 contribution)
    const activeDays = heatmap.filter((c) => c.count > 0).length;

    return {
      avgPRsPerWeek: Math.round(avgPRsPerWeek * 10) / 10, // Round to 1 decimal
      mostProductiveDay,
      busiestWeek,
      totalWeeks,
      activeDays,
    };
  }

  /**
   * Compute turnaround time metrics
   */
  private computeTurnaroundTimes(
    engineerPRs: PullRequest[],
    allReviews: Review[]
  ): {
    timeToFirstReview: { median: number; p75: number; p95: number };
    timeToApproval: { median: number; p75: number; p95: number };
    timeToMerge: { median: number; p75: number; p95: number };
  } {
    const prIds = new Set(engineerPRs.map((pr) => pr.id));
    const prReviews = new Map<number, Review[]>();

    // Group reviews by PR
    for (const review of allReviews) {
      if (prIds.has(review.pullRequestId)) {
        const reviews = prReviews.get(review.pullRequestId) || [];
        reviews.push(review);
        prReviews.set(review.pullRequestId, reviews);
      }
    }

    const timeToFirstReviewHours: number[] = [];
    const timeToApprovalHours: number[] = [];
    const timeToMergeHours: number[] = [];

    for (const pr of engineerPRs) {
      const reviews = prReviews.get(pr.id) || [];
      if (reviews.length === 0) continue;

      // Sort reviews by submission time
      const sortedReviews = reviews.sort(
        (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
      );

      // Time to first review
      const firstReview = sortedReviews[0];
      if (firstReview) {
        const hoursToFirstReview =
          (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursToFirstReview >= 0) {
          timeToFirstReviewHours.push(hoursToFirstReview);
        }
      }

      // Time to approval
      const firstApproval = sortedReviews.find((r) => r.state === 'APPROVED');
      if (firstApproval) {
        const hoursToApproval =
          (firstApproval.submittedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursToApproval >= 0) {
          timeToApprovalHours.push(hoursToApproval);
        }
      }

      // Time to merge (for merged PRs)
      if (pr.state === 'merged' && pr.mergedAt) {
        const hoursToMerge = (pr.mergedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursToMerge >= 0) {
          timeToMergeHours.push(hoursToMerge);
        }
      }
    }

    return {
      timeToFirstReview: this.computePercentiles(timeToFirstReviewHours),
      timeToApproval: this.computePercentiles(timeToApprovalHours),
      timeToMerge: this.computePercentiles(timeToMergeHours),
    };
  }

  /**
   * Compute percentiles (p50/median, p75, p95) for a dataset
   */
  private computePercentiles(values: number[]): { median: number; p75: number; p95: number } {
    if (values.length === 0) {
      return { median: 0, p75: 0, p95: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      const value = sorted[Math.max(0, index)];
      return value !== undefined ? Math.round(value * 10) / 10 : 0; // Round to 1 decimal
    };

    return {
      median: getPercentile(50),
      p75: getPercentile(75),
      p95: getPercentile(95),
    };
  }

  /**
   * Compute code contribution heatmap (commits only, excluding merge commits)
   */
  private computeCodeContributionHeatmap(
    commits: Commit[],
    dateRange: DateRange
  ): DailyContribution[] {
    const dailyCommits = new Map<string, number>();

    // Helper to get date string
    const getDateString = (date: Date): string => {
      return date.toISOString().split('T')[0]!;
    };

    // Helper to get contribution level (different scale for commits)
    const getLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
      if (count === 0) return 0;
      if (count <= 3) return 1; // 1-3 commits
      if (count <= 6) return 2; // 4-6 commits
      if (count <= 10) return 3; // 7-10 commits
      return 4; // 11+ commits
    };

    // Initialize all dates in range with 0
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      const dateStr = getDateString(currentDate);
      dailyCommits.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count commits per day
    for (const commit of commits) {
      const dateStr = getDateString(commit.committedAt);
      if (dailyCommits.has(dateStr)) {
        dailyCommits.set(dateStr, dailyCommits.get(dateStr)! + 1);
      }
    }

    // Convert to array format
    const heatmap: DailyContribution[] = [];
    for (const [date, count] of dailyCommits) {
      heatmap.push({
        date,
        count,
        level: getLevel(count),
      });
    }

    return heatmap.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Compute code impact heatmap (line changes from PRs + commits)
   * Shows daily line changes (additions + deletions) from merged PRs and direct commits
   */
  private computeCodeImpactHeatmap(
    prs: PullRequest[],
    commits: Commit[],
    dateRange: DateRange
  ): DailyContribution[] {
    const dailyLineChanges = new Map<string, number>();

    // Helper to get date string
    const getDateString = (date: Date): string => {
      return date.toISOString().split('T')[0]!;
    };

    // Helper to get contribution level based on line changes
    const getLevel = (lines: number): 0 | 1 | 2 | 3 | 4 => {
      if (lines === 0) return 0;
      if (lines <= 100) return 1; // 1-100 lines
      if (lines <= 500) return 2; // 101-500 lines
      if (lines <= 1000) return 3; // 501-1000 lines
      return 4; // 1000+ lines
    };

    // Initialize all dates in range with 0
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      const dateStr = getDateString(currentDate);
      dailyLineChanges.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add line changes from merged PRs (by merged date)
    const mergedPRs = prs.filter((pr) => pr.state === 'merged' && pr.mergedAt);
    for (const pr of mergedPRs) {
      if (pr.mergedAt) {
        const dateStr = getDateString(pr.mergedAt);
        if (dailyLineChanges.has(dateStr)) {
          const currentLines = dailyLineChanges.get(dateStr)!;
          dailyLineChanges.set(dateStr, currentLines + pr.additions + pr.deletions);
        }
      }
    }

    // Add line changes from direct commits (non-merge, non-squash)
    const directCommits = commits.filter((c) => !isMergeCommit(c) && !isSquashMergeCommit(c));
    for (const commit of directCommits) {
      const dateStr = getDateString(commit.committedAt);
      if (dailyLineChanges.has(dateStr)) {
        const currentLines = dailyLineChanges.get(dateStr)!;
        dailyLineChanges.set(dateStr, currentLines + commit.additions + commit.deletions);
      }
    }

    // Convert to array format
    const heatmap: DailyContribution[] = [];
    for (const [date, lines] of dailyLineChanges) {
      heatmap.push({
        date,
        count: lines,
        level: getLevel(lines),
      });
    }

    return heatmap.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate repository health report
   */
  generateRepositoryHealthReport(options: ReportOptions): RepositoryHealthReport {
    // Fetch all data
    const allPRs = this.prRepository.findByDateRange(options.dateRange);
    const allReviews = this.reviewRepository.findByDateRange(options.dateRange);

    // Filter by repositories if specified
    const prs =
      options.repositories && options.repositories.length > 0
        ? allPRs.filter((pr) => options.repositories!.includes(pr.repository))
        : allPRs;

    const reviews =
      options.repositories && options.repositories.length > 0
        ? allReviews.filter((review) => options.repositories!.includes(review.repository))
        : allReviews;

    // Group data by repository
    const repoMap = new Map<string, PullRequest[]>();
    for (const pr of prs) {
      const existing = repoMap.get(pr.repository) || [];
      existing.push(pr);
      repoMap.set(pr.repository, existing);
    }

    // Calculate metrics for each repository
    const repositories: RepositoryHealthMetrics[] = [];

    for (const [repo, repoPRs] of repoMap.entries()) {
      const prIds = new Set(repoPRs.map((pr) => pr.id));
      const repoReviews = reviews.filter((r) => prIds.has(r.pullRequestId));

      // Calculate metrics
      const prCount = repoPRs.length;
      const prsMerged = repoPRs.filter((pr) => pr.state === 'merged').length;
      const mergeRate = prCount > 0 ? (prsMerged / prCount) * 100 : 0;

      // Calculate average review time
      const reviewTimes: number[] = [];
      const reviewsByPR = new Map<number, Review[]>();
      for (const review of repoReviews) {
        const existing = reviewsByPR.get(review.pullRequestId) || [];
        existing.push(review);
        reviewsByPR.set(review.pullRequestId, existing);
      }

      for (const pr of repoPRs) {
        const prReviews = reviewsByPR.get(pr.id) || [];
        if (prReviews.length > 0) {
          const firstReview = prReviews.sort(
            (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
          )[0];
          if (firstReview) {
            const hours =
              (firstReview.submittedAt.getTime() - pr.createdAt.getTime()) / (1000 * 60 * 60);
            if (hours >= 0) {
              reviewTimes.push(hours);
            }
          }
        }
      }

      const avgReviewTime =
        reviewTimes.length > 0
          ? reviewTimes.reduce((sum, t) => sum + t, 0) / reviewTimes.length
          : 0;

      const activeEngineers = new Set(repoPRs.map((pr) => pr.author)).size;
      const linesAdded = repoPRs.reduce((sum, pr) => sum + pr.additions, 0);
      const linesDeleted = repoPRs.reduce((sum, pr) => sum + pr.deletions, 0);
      const avgPrSize = prCount > 0 ? (linesAdded + linesDeleted) / prCount : 0;

      repositories.push({
        repository: repo,
        prCount,
        prsMerged,
        mergeRate: Math.round(mergeRate * 10) / 10,
        avgReviewTime: Math.round(avgReviewTime * 10) / 10,
        activeEngineers,
        linesAdded,
        linesDeleted,
        avgPrSize: Math.round(avgPrSize),
      });
    }

    // Sort and categorize
    const sortedByActivity = [...repositories].sort((a, b) => b.prCount - a.prCount);
    const sortedByMergeRate = [...repositories].sort((a, b) => b.mergeRate - a.mergeRate);
    const sortedByReviewTime = [...repositories].sort((a, b) => b.avgReviewTime - a.avgReviewTime);

    return {
      organization: options.organization,
      dateRange: options.dateRange,
      repositories: sortedByActivity,
      mostActive: sortedByActivity.slice(0, 5),
      leastActive: sortedByActivity.slice(-5).reverse(),
      bestMergeRate: sortedByMergeRate.slice(0, 5),
      slowestReviews: sortedByReviewTime.slice(0, 5),
    };
  }

  /**
   * Get list of all engineers in database
   */
  getEngineers(): string[] {
    // Use repository method to get unique authors
    return this.prRepository.getUniqueAuthors();
  }

  /**
   * Get list of all repositories in database
   */
  getRepositories(): string[] {
    return this.prRepository.getUniqueRepositories();
  }

  /**
   * Check if data exists for the requested date range
   * Returns information about sync coverage
   */
  checkDataCoverage(
    organization: string,
    dateRange: DateRange,
    repository?: string
  ): {
    hasCoverage: boolean;
    syncedRanges: Array<{ start: Date; end: Date; repository: string }>;
    missingRepositories: string[];
  } {
    const result = {
      hasCoverage: false,
      syncedRanges: [] as Array<{ start: Date; end: Date; repository: string }>,
      missingRepositories: [] as string[],
    };

    if (repository) {
      // Check single repository
      const sync = this.syncMetadataRepository.getLastSync(
        'pull_requests',
        organization,
        repository
      );

      if (
        sync &&
        sync.dateRangeStart &&
        sync.dateRangeEnd &&
        sync.dateRangeStart <= dateRange.start &&
        sync.dateRangeEnd >= dateRange.end
      ) {
        result.hasCoverage = true;
        result.syncedRanges.push({
          start: sync.dateRangeStart,
          end: sync.dateRangeEnd,
          repository,
        });
      } else {
        result.missingRepositories.push(repository);
      }
    } else {
      // Check all repositories
      const repos = this.syncMetadataRepository.getRepositories(organization);

      for (const repo of repos) {
        const sync = this.syncMetadataRepository.getLastSync('pull_requests', organization, repo);

        if (
          sync &&
          sync.dateRangeStart &&
          sync.dateRangeEnd &&
          sync.dateRangeStart <= dateRange.start &&
          sync.dateRangeEnd >= dateRange.end
        ) {
          result.syncedRanges.push({
            start: sync.dateRangeStart,
            end: sync.dateRangeEnd,
            repository: repo,
          });
        }
      }

      // If we have any synced ranges, we have coverage
      result.hasCoverage = result.syncedRanges.length > 0;
    }

    return result;
  }
}
