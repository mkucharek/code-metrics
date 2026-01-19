/**
 * CommitFile Domain Model
 * Represents a file changed in a commit
 */

export interface CommitFile {
  /** Commit SHA this file belongs to */
  commitSha: string;

  /** Repository full name (owner/repo) */
  repository: string;

  /** File path */
  filename: string;

  /** Change status (added, modified, removed, renamed) */
  status: string;

  /** Number of lines added in this file */
  additions: number;

  /** Number of lines deleted in this file */
  deletions: number;
}

/**
 * Type guard to check if an object is a CommitFile
 */
export function isCommitFile(obj: unknown): obj is CommitFile {
  if (typeof obj !== 'object' || obj === null) return false;

  const file = obj as Partial<CommitFile>;

  return (
    typeof file.commitSha === 'string' &&
    typeof file.repository === 'string' &&
    typeof file.filename === 'string' &&
    typeof file.status === 'string' &&
    typeof file.additions === 'number' &&
    typeof file.deletions === 'number'
  );
}
