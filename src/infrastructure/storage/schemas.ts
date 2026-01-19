/**
 * Database Schemas
 * SQL table definitions for all entities
 */

export const PULL_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS pull_requests (
    id INTEGER PRIMARY KEY,
    number INTEGER NOT NULL,
    repository TEXT NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('open', 'closed', 'merged')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    merged_at TEXT,
    closed_at TEXT,
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    changed_files INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    review_comment_count INTEGER NOT NULL DEFAULT 0,
    commit_count INTEGER NOT NULL DEFAULT 0,
    labels TEXT NOT NULL DEFAULT '[]',
    is_draft INTEGER NOT NULL DEFAULT 0,
    UNIQUE(repository, number)
  );
`;

export const PULL_REQUESTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_pr_author ON pull_requests(author);
  CREATE INDEX IF NOT EXISTS idx_pr_repository ON pull_requests(repository);
  CREATE INDEX IF NOT EXISTS idx_pr_created_at ON pull_requests(created_at);
  CREATE INDEX IF NOT EXISTS idx_pr_state ON pull_requests(state);
  CREATE INDEX IF NOT EXISTS idx_pr_author_created ON pull_requests(author, created_at);
`;

export const REVIEWS_TABLE = `
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    pull_request_id INTEGER NOT NULL,
    repository TEXT NOT NULL,
    reviewer TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING')),
    submitted_at TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    comment_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
  );
`;

export const REVIEWS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_review_pr ON reviews(pull_request_id);
  CREATE INDEX IF NOT EXISTS idx_review_reviewer ON reviews(reviewer);
  CREATE INDEX IF NOT EXISTS idx_review_submitted_at ON reviews(submitted_at);
  CREATE INDEX IF NOT EXISTS idx_review_reviewer_submitted ON reviews(reviewer, submitted_at);
`;

export const COMMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    pull_request_id INTEGER NOT NULL,
    repository TEXT NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('issue_comment', 'review_comment')),
    review_id INTEGER,
    path TEXT,
    line INTEGER,
    FOREIGN KEY(pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE
  );
`;

export const COMMENTS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_comment_pr ON comments(pull_request_id);
  CREATE INDEX IF NOT EXISTS idx_comment_author ON comments(author);
  CREATE INDEX IF NOT EXISTS idx_comment_created_at ON comments(created_at);
  CREATE INDEX IF NOT EXISTS idx_comment_author_created ON comments(author, created_at);
  CREATE INDEX IF NOT EXISTS idx_comment_review ON comments(review_id);
`;

export const SYNC_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('pull_requests', 'reviews', 'comments')),
    organization TEXT NOT NULL,
    repository TEXT,
    last_sync_at TEXT NOT NULL,
    date_range_start TEXT,
    date_range_end TEXT,
    items_synced INTEGER NOT NULL DEFAULT 0,
    UNIQUE(resource_type, organization, repository)
  );
`;

export const SYNC_METADATA_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_sync_org ON sync_metadata(organization);
  CREATE INDEX IF NOT EXISTS idx_sync_type_org ON sync_metadata(resource_type, organization);
`;

export const COMMITS_TABLE = `
  CREATE TABLE IF NOT EXISTS commits (
    sha TEXT PRIMARY KEY,
    repository TEXT NOT NULL,
    author TEXT NOT NULL,
    author_email TEXT NOT NULL,
    committed_at INTEGER NOT NULL,
    message TEXT NOT NULL,
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,
    changed_files INTEGER NOT NULL DEFAULT 0
  );
`;

export const COMMITS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_commit_repository ON commits(repository);
  CREATE INDEX IF NOT EXISTS idx_commit_author ON commits(author);
  CREATE INDEX IF NOT EXISTS idx_commit_committed_at ON commits(committed_at);
  CREATE INDEX IF NOT EXISTS idx_commit_author_date ON commits(author, committed_at);
`;

export const REPOSITORY_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS repository_metadata (
    repository TEXT PRIMARY KEY,
    default_branch TEXT NOT NULL,
    last_fetched INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`;

export const REPOSITORY_METADATA_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_repo_metadata_fetched ON repository_metadata(last_fetched);
`;

/**
 * All table creation statements
 */
export const ALL_TABLES = [
  PULL_REQUESTS_TABLE,
  PULL_REQUESTS_INDEXES,
  REVIEWS_TABLE,
  REVIEWS_INDEXES,
  COMMENTS_TABLE,
  COMMENTS_INDEXES,
  SYNC_METADATA_TABLE,
  SYNC_METADATA_INDEXES,
  COMMITS_TABLE,
  COMMITS_INDEXES,
  REPOSITORY_METADATA_TABLE,
  REPOSITORY_METADATA_INDEXES,
];

/**
 * Initialize all database tables
 */
export function initializeTables(db: { exec: (sql: string) => void }): void {
  for (const sql of ALL_TABLES) {
    db.exec(sql);
  }
}
