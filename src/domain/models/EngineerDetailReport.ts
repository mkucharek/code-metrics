/**
 * Engineer Detail Report Model
 * Comprehensive report for a single engineer's contributions and activity
 */

import type { DateRange } from './DateRange';

/**
 * Collaboration partner with count and team info
 */
export interface CollaborationPartner {
  engineer: string;
  count: number;
  isCrossTeam?: boolean; // True if collaborator is from a different team
  team?: string; // Team ID of the collaborator (if known)
}

/**
 * Repository contribution summary
 */
export interface RepositoryContribution {
  repository: string;
  prCount: number;
  linesAdded: number;
  linesDeleted: number;
}

/**
 * Weekly activity summary
 */
export interface WeeklyActivity {
  weekNumber: string; // ISO week number (W01, W25, etc.)
  weekStart: string; // ISO date of week start (Monday)
  prsOpened: number;
  prsMerged: number;
  reviewsGiven: number;
  commentsWritten: number;
  avgPrSize: number; // Average PR size this week
  smallPRs: number; // Count of small PRs (<100 lines)
  mediumPRs: number; // Count of medium PRs (100-500 lines)
  largePRs: number; // Count of large PRs (>500 lines)
}

/**
 * PR size distribution
 */
export interface PRSizeDistribution {
  small: number; // < 100 lines
  medium: number; // 100-500 lines
  large: number; // > 500 lines
}

/**
 * Individual PR detail for PR list
 */
export interface PRDetail {
  weekNumber: string; // Week number (W01, W25)
  repository: string;
  prNumber: number;
  title: string; // Truncated to 60 chars
  status: 'open' | 'closed' | 'merged';
  linesAdded: number;
  linesDeleted: number;
  reviews: number; // Number of reviews received
  comments: number; // Total comments
  timeToMerge: string; // "2d", "5h", "N/A" for open/closed
  changedFiles: number;
  commits: number;
  createdAt: Date; // For sorting
}

/**
 * Individual commit detail for commits list
 */
export interface CommitDetail {
  date: string; // ISO date (YYYY-MM-DD)
  sha: string; // Short SHA (7 chars) for display
  fullSha: string; // Full SHA for linking to GitHub
  message: string; // Commit message
  repository: string;
  additions: number; // Lines added
  deletions: number; // Lines deleted
  prNumber?: number | null; // PR number this commit belongs to (null for direct commits)
}

/**
 * Daily contribution count for heatmap
 */
export interface DailyContribution {
  date: string; // ISO date (YYYY-MM-DD)
  count: number; // Total contributions that day
  level: 0 | 1 | 2 | 3 | 4; // Intensity level for coloring
}

/**
 * Summary statistics for quick overview
 */
export interface SummaryStats {
  avgPRsPerWeek: number;
  mostProductiveDay: string; // Day name (e.g., "Monday")
  busiestWeek: string; // Week number (e.g., "W35")
  totalWeeks: number;
  activeDays: number; // Days with at least 1 contribution
}

/**
 * Detailed report for a single engineer
 */
export interface EngineerDetailReport {
  engineer: string;
  organization: string;
  dateRange: DateRange;

  /** Summary Stats */
  summary: SummaryStats;

  /** Activity Overview */
  activity: {
    prsOpened: number;
    prsMerged: number;
    prsClosed: number;
    linesAdded: number;
    linesDeleted: number;
    totalChurn: number;
    avgPrSize: number;
    mergeRate: number; // Percentage
    prSizeDistribution: PRSizeDistribution;
  };

  /** Code Contributions (Commits) */
  commits: {
    totalCommits: number;
    linesAdded: number;
    linesDeleted: number;
    avgCommitSize: number;
    avgCommitsPerDay: number;
  };

  /** Code Review Activity */
  reviews: {
    prsReviewed: number;
    commentsMade: number;
    avgCommentsPerReview: number;
  };

  /** Review Turnaround Times */
  turnaround: {
    timeToFirstReview: {
      median: number; // hours
      p75: number;
      p95: number;
    };
    timeToApproval: {
      median: number; // hours
      p75: number;
      p95: number;
    };
    timeToMerge: {
      median: number; // hours
      p75: number;
      p95: number;
    };
  };

  /** Collaboration Patterns */
  collaboration: {
    topReviewers: CollaborationPartner[]; // Who reviewed their PRs most
    topReviewedEngineers: CollaborationPartner[]; // Who they reviewed most
    crossTeamCollaboration: number; // Percentage of reviews involving other teams
    reviewDistribution: {
      totalReviewers: number; // Unique reviewers
      reviewConcentration: number; // Percentage of reviews from top 3 reviewers
    };
  };

  /** Repository Contributions */
  repositories: RepositoryContribution[];

  /** Weekly Timeline */
  timeline: WeeklyActivity[];

  /** PR List */
  prs: PRDetail[];

  /** Commits List (Non-Merge) */
  commitsList: CommitDetail[];

  /** Contribution Heatmap (PRs, Reviews, Comments) */
  contributionHeatmap: DailyContribution[];

  /** Code Contributions Heatmap (Commits only) */
  codeContributionHeatmap: DailyContribution[];

  /** Code Impact Heatmap (Line changes from PRs + Commits) */
  codeImpactHeatmap: DailyContribution[];
}
