/**
 * Review Domain Model
 * Represents a GitHub pull request review
 */

export interface Review {
  /** Unique identifier for the review */
  id: number;

  /** ID of the pull request being reviewed */
  pullRequestId: number;

  /** Repository full name (owner/repo) */
  repository: string;

  /** GitHub username of the reviewer */
  reviewer: string;

  /** Review state */
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';

  /** When the review was submitted */
  submittedAt: Date;

  /** Review body/comment text */
  body: string;

  /** Number of comments in this review */
  commentCount: number;
}

/**
 * Type guard to check if an object is a Review
 */
export function isReview(obj: unknown): obj is Review {
  if (typeof obj !== 'object' || obj === null) return false;

  const review = obj as Partial<Review>;

  return (
    typeof review.id === 'number' &&
    typeof review.pullRequestId === 'number' &&
    typeof review.repository === 'string' &&
    typeof review.reviewer === 'string' &&
    (review.state === 'APPROVED' ||
      review.state === 'CHANGES_REQUESTED' ||
      review.state === 'COMMENTED' ||
      review.state === 'DISMISSED' ||
      review.state === 'PENDING') &&
    review.submittedAt instanceof Date &&
    typeof review.body === 'string' &&
    typeof review.commentCount === 'number'
  );
}
