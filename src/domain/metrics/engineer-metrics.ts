/**
 * Engineer Metrics Computation
 * Pure functions to compute metrics for individual engineers
 */

import type { PullRequest, Review, Comment, DateRange, EngineerMetrics } from '../models';
import { isDateInRange } from '../models/DateRange';

/**
 * Compute metrics for a single engineer
 */
export function computeEngineerMetrics(
  engineer: string,
  pullRequests: PullRequest[],
  reviews: Review[],
  comments: Comment[],
  dateRange: DateRange
): EngineerMetrics {
  // Filter data by engineer and date range
  const engineerPRs = pullRequests.filter(
    (pr) => pr.author === engineer && isDateInRange(pr.createdAt, dateRange)
  );

  const engineerReviews = reviews.filter(
    (review) => review.reviewer === engineer && isDateInRange(review.submittedAt, dateRange)
  );

  const engineerComments = comments.filter(
    (comment) => comment.author === engineer && isDateInRange(comment.createdAt, dateRange)
  );

  // Count PRs created
  const prsCreated = engineerPRs.length;

  // Count reviews given
  const reviewsGiven = engineerReviews.length;

  // Sum lines added and deleted
  const linesAdded = engineerPRs.reduce((sum, pr) => sum + pr.additions, 0);
  const linesDeleted = engineerPRs.reduce((sum, pr) => sum + pr.deletions, 0);
  const netLines = linesAdded - linesDeleted;
  const totalLinesChanged = linesAdded + linesDeleted;

  // Count comments
  const commentsCreated = engineerComments.length;

  // Calculate average PR size
  const avgPRSize = prsCreated > 0 ? Math.round(totalLinesChanged / prsCreated) : 0;

  // Count merged PRs
  const prsMerged = engineerPRs.filter((pr) => pr.state === 'merged').length;

  // Calculate merge rate
  const mergeRate = prsCreated > 0 ? prsMerged / prsCreated : 0;

  // Get unique repositories
  const repositories = Array.from(new Set(engineerPRs.map((pr) => pr.repository)));

  return {
    engineer,
    dateRange: {
      start: dateRange.start,
      end: dateRange.end,
    },
    prsCreated,
    reviewsGiven,
    linesAdded,
    linesDeleted,
    netLines,
    totalLinesChanged,
    commentsCreated,
    avgPRSize,
    prsMerged,
    mergeRate,
    repositories,
  };
}

/**
 * Compute metrics for multiple engineers
 */
export function computeMultipleEngineerMetrics(
  engineers: string[],
  pullRequests: PullRequest[],
  reviews: Review[],
  comments: Comment[],
  dateRange: DateRange
): EngineerMetrics[] {
  return engineers.map((engineer) =>
    computeEngineerMetrics(engineer, pullRequests, reviews, comments, dateRange)
  );
}

/**
 * Get unique engineers from pull requests, reviews, and comments
 */
export function getUniqueEngineers(
  pullRequests: PullRequest[],
  reviews: Review[],
  comments: Comment[]
): string[] {
  const engineers = new Set<string>();

  pullRequests.forEach((pr) => engineers.add(pr.author));
  reviews.forEach((review) => engineers.add(review.reviewer));
  comments.forEach((comment) => engineers.add(comment.author));

  return Array.from(engineers).sort();
}

/**
 * Filter pull requests by date range
 */
export function filterPRsByDateRange(prs: PullRequest[], dateRange: DateRange): PullRequest[] {
  return prs.filter((pr) => isDateInRange(pr.createdAt, dateRange));
}

/**
 * Filter reviews by date range
 */
export function filterReviewsByDateRange(reviews: Review[], dateRange: DateRange): Review[] {
  return reviews.filter((review) => isDateInRange(review.submittedAt, dateRange));
}

/**
 * Filter comments by date range
 */
export function filterCommentsByDateRange(comments: Comment[], dateRange: DateRange): Comment[] {
  return comments.filter((comment) => isDateInRange(comment.createdAt, dateRange));
}
