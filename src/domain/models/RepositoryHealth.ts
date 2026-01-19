/**
 * Repository Health Model
 * Tracks repository-level health indicators and activity
 */

import type { DateRange } from './DateRange';

/**
 * Health metrics for a single repository
 */
export interface RepositoryHealthMetrics {
  repository: string;
  prCount: number;
  prsMerged: number;
  mergeRate: number; // Percentage
  avgReviewTime: number; // Hours
  activeEngineers: number;
  linesAdded: number;
  linesDeleted: number;
  avgPrSize: number;
}

/**
 * Repository health report
 */
export interface RepositoryHealthReport {
  organization: string;
  dateRange: DateRange;
  repositories: RepositoryHealthMetrics[];
  mostActive: RepositoryHealthMetrics[];
  leastActive: RepositoryHealthMetrics[];
  bestMergeRate: RepositoryHealthMetrics[];
  slowestReviews: RepositoryHealthMetrics[];
}
