/**
 * Comment Domain Model
 * Represents a comment on a pull request (issue comment or review comment)
 */

export interface Comment {
  /** Unique identifier for the comment */
  id: number;

  /** ID of the pull request */
  pullRequestId: number;

  /** Repository full name (owner/repo) */
  repository: string;

  /** GitHub username of the comment author */
  author: string;

  /** Comment body text */
  body: string;

  /** When the comment was created */
  createdAt: Date;

  /** When the comment was last updated */
  updatedAt: Date;

  /** Type of comment */
  type: 'issue_comment' | 'review_comment';

  /** Whether this is part of a review (for review comments) */
  reviewId: number | null;

  /** Path to the file being commented on (for review comments) */
  path: string | null;

  /** Line number in the diff (for review comments) */
  line: number | null;
}

/**
 * Type guard to check if an object is a Comment
 */
export function isComment(obj: unknown): obj is Comment {
  if (typeof obj !== 'object' || obj === null) return false;

  const comment = obj as Partial<Comment>;

  return (
    typeof comment.id === 'number' &&
    typeof comment.pullRequestId === 'number' &&
    typeof comment.repository === 'string' &&
    typeof comment.author === 'string' &&
    typeof comment.body === 'string' &&
    comment.createdAt instanceof Date &&
    comment.updatedAt instanceof Date &&
    (comment.type === 'issue_comment' || comment.type === 'review_comment') &&
    (comment.reviewId === null || typeof comment.reviewId === 'number') &&
    (comment.path === null || typeof comment.path === 'string') &&
    (comment.line === null || typeof comment.line === 'number')
  );
}
