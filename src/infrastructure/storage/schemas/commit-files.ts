/**
 * CommitFiles Table Schema
 * Stores file-level changes for each commit
 */

export const COMMIT_FILES_TABLE = `
  CREATE TABLE IF NOT EXISTS commit_files (
    commit_sha TEXT NOT NULL,
    repository TEXT NOT NULL,
    filename TEXT NOT NULL,
    status TEXT NOT NULL,
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (commit_sha, repository, filename),
    FOREIGN KEY(commit_sha) REFERENCES commits(sha) ON DELETE CASCADE
  );
`;

export const COMMIT_FILES_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_commit_files_sha ON commit_files(commit_sha);
  CREATE INDEX IF NOT EXISTS idx_commit_files_filename ON commit_files(filename);
  CREATE INDEX IF NOT EXISTS idx_commit_files_repository ON commit_files(repository);
  CREATE INDEX IF NOT EXISTS idx_commit_files_repo_filename ON commit_files(repository, filename);
`;
