/**
 * GitHub API to Domain Model Mappers
 * Converts GitHub API responses to domain models
 */

import type { Comment, Commit, PullRequest, Review } from '../../domain/models';
import type { GitHubComment, GitHubCommit, GitHubPullRequest, GitHubReview } from './schemas';

/**
 * Convert GitHub PR to domain PullRequest
 */
export function mapPullRequest(githubPR: GitHubPullRequest): PullRequest {
  // GitHub API returns state='closed' for both closed and merged PRs
  // Use merged_at to determine if PR was actually merged
  const state: 'open' | 'closed' | 'merged' = githubPR.merged_at ? 'merged' : githubPR.state;

  return {
    id: githubPR.id,
    number: githubPR.number,
    title: githubPR.title,
    body: githubPR.body ?? '',
    author: githubPR.user?.login ?? 'unknown',
    state,
    mergedBy: githubPR.merged_by?.login ?? null,
    headBranch: githubPR.head.ref,
    baseBranch: githubPR.base.ref,
    createdAt: new Date(githubPR.created_at),
    updatedAt: new Date(githubPR.updated_at),
    closedAt: githubPR.closed_at ? new Date(githubPR.closed_at) : null,
    mergedAt: githubPR.merged_at ? new Date(githubPR.merged_at) : null,
    repository: githubPR.base.repo.name,
    additions: githubPR.additions,
    deletions: githubPR.deletions,
    changedFiles: githubPR.changed_files,
    commentCount: githubPR.comments,
    reviewCommentCount: githubPR.review_comments,
    commitCount: githubPR.commits,
    labels: githubPR.labels.map((label) => label.name),
    isDraft: githubPR.draft,
    requestedReviewers: githubPR.requested_reviewers.map((reviewer) => reviewer.login),
  };
}

/**
 * Convert GitHub Review to domain Review
 */
export function mapReview(githubReview: GitHubReview, prId: number, repository: string): Review {
  return {
    id: githubReview.id,
    pullRequestId: prId,
    repository,
    reviewer: githubReview.user?.login ?? 'unknown',
    state: githubReview.state,
    body: githubReview.body ?? '',
    submittedAt: githubReview.submitted_at ? new Date(githubReview.submitted_at) : new Date(),
    commentCount: 0, // Will be updated when comments are stored
  };
}

/**
 * Convert GitHub Comment to domain Comment
 */
export function mapComment(
  githubComment: GitHubComment,
  prId: number,
  repository: string,
  type: 'issue_comment' | 'review_comment' = 'issue_comment',
  reviewId: number | null = null
): Comment {
  return {
    id: githubComment.id,
    pullRequestId: prId,
    repository,
    author: githubComment.user?.login ?? 'unknown',
    body: githubComment.body ?? '',
    createdAt: new Date(githubComment.created_at),
    updatedAt: new Date(githubComment.updated_at),
    type,
    reviewId,
    // For review comments, GitHub provides path and line; for issue comments they're undefined
    path: githubComment.path ?? null,
    line: githubComment.line ?? null,
  };
}

/**
 * Convert GitHub Commit to domain Commit
 * @param pullRequestId - Optional PR ID for commits fetched from a PR
 */
export function mapCommit(
  githubCommit: GitHubCommit,
  repository: string,
  pullRequestId?: number | null
): Commit {
  return {
    sha: githubCommit.sha,
    repository,
    author: githubCommit.author?.login ?? 'unknown',
    authorEmail: githubCommit.commit.author.email,
    // Use committer date (when code landed) not author date (when originally written)
    // This is important for squash-merge workflows where the author date is preserved
    // from the original feature branch commits, but we want to show when the PR was merged
    committedAt: new Date(githubCommit.commit.committer.date),
    message: githubCommit.commit.message,
    additions: githubCommit.stats?.additions || 0,
    deletions: githubCommit.stats?.deletions || 0,
    changedFiles: githubCommit.files?.length || 0,
    parentCount: githubCommit.parents.length,
    pullRequestId: pullRequestId ?? null,
  };
}
