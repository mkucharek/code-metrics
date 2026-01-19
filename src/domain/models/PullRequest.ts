/**
 * Pull Request Domain Model
 * Represents a GitHub pull request with relevant metrics data
 */

export interface PullRequest {
  /** Unique identifier for the PR */
  id: number;

  /** PR number within the repository */
  number: number;

  /** Repository full name (owner/repo) */
  repository: string;

  /** GitHub username of the PR author */
  author: string;

  /** PR title */
  title: string;

  /** PR description/body text */
  body: string;

  /** PR state (open, closed, merged) */
  state: 'open' | 'closed' | 'merged';

  /** GitHub username of who merged the PR (null if not merged) */
  mergedBy: string | null;

  /** Head branch name (source branch being merged from) */
  headBranch: string;

  /** Base branch name (target branch being merged into) */
  baseBranch: string;

  /** When the PR was created */
  createdAt: Date;

  /** When the PR was last updated */
  updatedAt: Date;

  /** When the PR was merged (null if not merged) */
  mergedAt: Date | null;

  /** When the PR was closed (null if still open) */
  closedAt: Date | null;

  /** Number of lines added */
  additions: number;

  /** Number of lines deleted */
  deletions: number;

  /** Number of changed files */
  changedFiles: number;

  /** Number of comments on the PR */
  commentCount: number;

  /** Number of review comments */
  reviewCommentCount: number;

  /** Number of commits */
  commitCount: number;

  /** PR labels */
  labels: string[];

  /** Whether the PR is a draft */
  isDraft: boolean;

  /** GitHub usernames of requested reviewers */
  requestedReviewers: string[];
}

/**
 * Type guard to check if an object is a PullRequest
 */
export function isPullRequest(obj: unknown): obj is PullRequest {
  if (typeof obj !== 'object' || obj === null) return false;

  const pr = obj as Partial<PullRequest>;

  return (
    typeof pr.id === 'number' &&
    typeof pr.number === 'number' &&
    typeof pr.repository === 'string' &&
    typeof pr.author === 'string' &&
    typeof pr.title === 'string' &&
    typeof pr.body === 'string' &&
    (pr.state === 'open' || pr.state === 'closed' || pr.state === 'merged') &&
    (pr.mergedBy === null || typeof pr.mergedBy === 'string') &&
    typeof pr.headBranch === 'string' &&
    typeof pr.baseBranch === 'string' &&
    pr.createdAt instanceof Date &&
    pr.updatedAt instanceof Date &&
    (pr.mergedAt === null || pr.mergedAt instanceof Date) &&
    (pr.closedAt === null || pr.closedAt instanceof Date) &&
    typeof pr.additions === 'number' &&
    typeof pr.deletions === 'number' &&
    typeof pr.changedFiles === 'number' &&
    typeof pr.commentCount === 'number' &&
    typeof pr.reviewCommentCount === 'number' &&
    typeof pr.commitCount === 'number' &&
    Array.isArray(pr.labels) &&
    typeof pr.isDraft === 'boolean' &&
    Array.isArray(pr.requestedReviewers)
  );
}
