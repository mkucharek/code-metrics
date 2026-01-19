/**
 * Organization Metrics Computation
 * Pure functions to compute aggregate metrics for organizations
 */

import type {
  PullRequest,
  Review,
  Comment,
  DateRange,
  OrganizationMetrics,
  EngineerMetrics,
  MetricSummary,
} from '../models';
import { ValidationError } from '../errors';
import {
  computeMultipleEngineerMetrics,
  getUniqueEngineers,
  filterPRsByDateRange,
  filterReviewsByDateRange,
  filterCommentsByDateRange,
} from './engineer-metrics';

/**
 * Compute organization-wide metrics
 */
export function computeOrganizationMetrics(
  organization: string,
  pullRequests: PullRequest[],
  reviews: Review[],
  comments: Comment[],
  dateRange: DateRange
): OrganizationMetrics {
  // Filter data by date range
  const filteredPRs = filterPRsByDateRange(pullRequests, dateRange);
  const filteredReviews = filterReviewsByDateRange(reviews, dateRange);
  const filteredComments = filterCommentsByDateRange(comments, dateRange);

  // Get unique engineers
  const uniqueEngineers = getUniqueEngineers(filteredPRs, filteredReviews, filteredComments);

  // Compute metrics for each engineer
  const engineerMetrics = computeMultipleEngineerMetrics(
    uniqueEngineers,
    filteredPRs,
    filteredReviews,
    filteredComments,
    dateRange
  );

  // Aggregate totals
  const totalPRsCreated = engineerMetrics.reduce((sum, em) => sum + em.prsCreated, 0);
  const totalReviewsGiven = engineerMetrics.reduce((sum, em) => sum + em.reviewsGiven, 0);
  const totalLinesAdded = engineerMetrics.reduce((sum, em) => sum + em.linesAdded, 0);
  const totalLinesDeleted = engineerMetrics.reduce((sum, em) => sum + em.linesDeleted, 0);
  const totalCommentsCreated = engineerMetrics.reduce((sum, em) => sum + em.commentsCreated, 0);
  const totalPRsMerged = engineerMetrics.reduce((sum, em) => sum + em.prsMerged, 0);

  // Calculate organization-wide averages
  const totalLinesChanged = totalLinesAdded + totalLinesDeleted;
  const avgPRSize = totalPRsCreated > 0 ? Math.round(totalLinesChanged / totalPRsCreated) : 0;
  const mergeRate = totalPRsCreated > 0 ? totalPRsMerged / totalPRsCreated : 0;

  // Get all unique repositories
  const allRepositories = new Set<string>();
  engineerMetrics.forEach((em) => em.repositories.forEach((repo) => allRepositories.add(repo)));

  return {
    organization,
    dateRange: {
      start: dateRange.start,
      end: dateRange.end,
    },
    engineerCount: uniqueEngineers.length,
    engineers: engineerMetrics,
    totalPRsCreated,
    totalReviewsGiven,
    totalLinesAdded,
    totalLinesDeleted,
    totalCommentsCreated,
    avgPRSize,
    totalPRsMerged,
    mergeRate,
    repositories: Array.from(allRepositories).sort(),
  };
}

/**
 * Compute summary statistics for a list of numbers
 */
export function computeSummaryStatistics(values: number[]): MetricSummary {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      total: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, val) => sum + val, 0);
  const avg = Math.round(total / values.length);

  // Safe array access with explicit checks
  const minValue = sorted[0];
  const maxValue = sorted[sorted.length - 1];

  if (minValue === undefined || maxValue === undefined) {
    // This should never happen given length check, but TypeScript needs it
    throw new ValidationError('Unexpected empty array after length check');
  }

  const median =
    sorted.length % 2 === 0
      ? Math.round(((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2)
      : (sorted[Math.floor(sorted.length / 2)] ?? 0);

  return {
    min: minValue,
    max: maxValue,
    avg,
    median,
    total,
  };
}

/**
 * Get summary statistics for PRs created across engineers
 */
export function getPRsCreatedSummary(engineers: EngineerMetrics[]): MetricSummary {
  return computeSummaryStatistics(engineers.map((e) => e.prsCreated));
}

/**
 * Get summary statistics for reviews given across engineers
 */
export function getReviewsGivenSummary(engineers: EngineerMetrics[]): MetricSummary {
  return computeSummaryStatistics(engineers.map((e) => e.reviewsGiven));
}

/**
 * Get summary statistics for lines added across engineers
 */
export function getLinesAddedSummary(engineers: EngineerMetrics[]): MetricSummary {
  return computeSummaryStatistics(engineers.map((e) => e.linesAdded));
}

/**
 * Get summary statistics for comments created across engineers
 */
export function getCommentsCreatedSummary(engineers: EngineerMetrics[]): MetricSummary {
  return computeSummaryStatistics(engineers.map((e) => e.commentsCreated));
}

/**
 * Numeric metric keys from EngineerMetrics
 */
type NumericMetricKey = keyof Pick<
  EngineerMetrics,
  | 'prsCreated'
  | 'reviewsGiven'
  | 'linesAdded'
  | 'linesDeleted'
  | 'commentsCreated'
  | 'avgPRSize'
  | 'prsMerged'
  | 'mergeRate'
  | 'netLines'
  | 'totalLinesChanged'
>;

/**
 * Rank engineers by a specific numeric metric
 */
export function rankEngineersByMetric(
  engineers: EngineerMetrics[],
  metric: NumericMetricKey
): EngineerMetrics[] {
  return [...engineers].sort((a, b) => {
    // Now TypeScript knows these are numbers
    const aValue = a[metric];
    const bValue = b[metric];

    // Runtime validation for extra safety
    if (typeof aValue !== 'number' || typeof bValue !== 'number') {
      throw new ValidationError(`Metric ${String(metric)} is not a numeric value`);
    }

    return bValue - aValue; // Descending order
  });
}
