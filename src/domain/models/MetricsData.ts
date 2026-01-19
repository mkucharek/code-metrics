/**
 * Metrics Data Models
 * Represents computed metrics for engineers and organizations
 */

export interface EngineerMetrics {
  /** Engineer's GitHub username */
  engineer: string;

  /** Date range for these metrics */
  dateRange: {
    start: Date;
    end: Date;
  };

  /** Number of pull requests created */
  prsCreated: number;

  /** Number of reviews given */
  reviewsGiven: number;

  /** Total lines of code added */
  linesAdded: number;

  /** Total lines of code deleted */
  linesDeleted: number;

  /** Net lines of code (additions - deletions) */
  netLines: number;

  /** Total lines changed (additions + deletions) */
  totalLinesChanged: number;

  /** Number of comments created (issue + review comments) */
  commentsCreated: number;

  /** Average PR size (lines changed per PR) */
  avgPRSize: number;

  /** Number of PRs merged */
  prsMerged: number;

  /** Merge rate (merged / created) */
  mergeRate: number;

  /** Repositories contributed to */
  repositories: string[];
}

export interface OrganizationMetrics {
  /** Organization name */
  organization: string;

  /** Date range for these metrics */
  dateRange: {
    start: Date;
    end: Date;
  };

  /** Total number of engineers */
  engineerCount: number;

  /** Metrics for each engineer */
  engineers: EngineerMetrics[];

  /** Total PRs created across organization */
  totalPRsCreated: number;

  /** Total reviews given across organization */
  totalReviewsGiven: number;

  /** Total lines added across organization */
  totalLinesAdded: number;

  /** Total lines deleted across organization */
  totalLinesDeleted: number;

  /** Total comments created across organization */
  totalCommentsCreated: number;

  /** Average PR size across organization */
  avgPRSize: number;

  /** Total PRs merged */
  totalPRsMerged: number;

  /** Organization-wide merge rate */
  mergeRate: number;

  /** All repositories with activity */
  repositories: string[];
}

/**
 * Summary statistics for a metric
 */
export interface MetricSummary {
  /** Minimum value */
  min: number;

  /** Maximum value */
  max: number;

  /** Average value */
  avg: number;

  /** Median value */
  median: number;

  /** Total sum */
  total: number;
}
