/**
 * GitHub Infrastructure Module
 * Exports GitHub API client and related types
 */

export { GitHubClient } from './GitHubClient';
export type { FetchPRsOptions } from './GitHubClient';
export {
  type GitHubPullRequest,
  type GitHubReview,
  type GitHubComment,
  type GitHubRateLimit,
  GitHubPullRequestSchema,
  GitHubReviewSchema,
  GitHubCommentSchema,
  validatePullRequests,
  validateReviews,
  validateComments,
} from './schemas';
export { GitHubSynchronizer, type SyncOptions, type SyncSummary } from './GitHubSynchronizer';
export { mapPullRequest, mapReview, mapComment } from './mappers';
