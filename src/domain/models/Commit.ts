/**
 * Commit Domain Model
 * Represents a GitHub commit with metrics data
 */

export interface Commit {
  /** Unique commit identifier (SHA) */
  sha: string;

  /** Repository full name (owner/repo) */
  repository: string;

  /** GitHub username of the commit author */
  author: string;

  /** Author email address */
  authorEmail: string;

  /** When the commit was made */
  committedAt: Date;

  /** Commit message */
  message: string;

  /** Number of lines added */
  additions: number;

  /** Number of lines deleted */
  deletions: number;

  /** Number of files changed */
  changedFiles: number;

  /** Number of parent commits (0-1 = regular commit, 2+ = merge commit) */
  parentCount: number;

  /** PR this commit belongs to (null for direct commits to main branch) */
  pullRequestId?: number | null;
}

/**
 * Type guard to check if an object is a Commit
 */
export function isCommit(obj: unknown): obj is Commit {
  if (typeof obj !== 'object' || obj === null) return false;

  const commit = obj as Partial<Commit>;

  return (
    typeof commit.sha === 'string' &&
    typeof commit.repository === 'string' &&
    typeof commit.author === 'string' &&
    typeof commit.authorEmail === 'string' &&
    commit.committedAt instanceof Date &&
    typeof commit.message === 'string' &&
    typeof commit.additions === 'number' &&
    typeof commit.deletions === 'number' &&
    typeof commit.changedFiles === 'number' &&
    typeof commit.parentCount === 'number'
  );
}

/**
 * Check if a commit is a merge commit based on parent count
 * Merge commits have 2 or more parents
 */
export function isMergeCommit(commit: Commit): boolean {
  return commit.parentCount >= 2;
}

/**
 * Check if a commit is a squash-merge commit from a PR
 * Squash-merge commits have the PR number appended by GitHub: "Title (#NUMBER)"
 */
export function isSquashMergeCommit(commit: Commit): boolean {
  return /\(#\d+\)/.test(commit.message);
}
