/**
 * Migration 002: Performance Indexes
 * Adds composite indexes to optimize common report generation queries
 */

import type { Migration } from './Migration';

export const migration002: Migration = {
  version: 2,
  description: 'Add composite indexes for optimized report generation queries',
  up: [
    // Composite index for repository + date range queries
    // Optimizes filtering PRs by repository and date range
    'CREATE INDEX IF NOT EXISTS idx_pr_repo_created ON pull_requests(repository, created_at);',

    // Composite index for state + date range queries
    // Optimizes filtering PRs by state (e.g., merged) and date
    'CREATE INDEX IF NOT EXISTS idx_pr_state_created ON pull_requests(state, created_at);',

    // Composite index for repository + reviewer + date queries
    // Optimizes filtering reviews by repository and date range
    'CREATE INDEX IF NOT EXISTS idx_review_repo_submitted ON reviews(repository, submitted_at);',

    // Composite index for repository + author + date queries
    // Optimizes filtering comments by repository and date range
    'CREATE INDEX IF NOT EXISTS idx_comment_repo_created ON comments(repository, created_at);',

    // Composite index for repository + PR lookup
    // Optimizes joining reviews/comments with PRs by repository
    'CREATE INDEX IF NOT EXISTS idx_review_repo_pr ON reviews(repository, pull_request_id);',
    'CREATE INDEX IF NOT EXISTS idx_comment_repo_pr ON comments(repository, pull_request_id);',
  ],
  down: [
    'DROP INDEX IF EXISTS idx_comment_repo_pr;',
    'DROP INDEX IF EXISTS idx_review_repo_pr;',
    'DROP INDEX IF EXISTS idx_comment_repo_created;',
    'DROP INDEX IF EXISTS idx_review_repo_submitted;',
    'DROP INDEX IF EXISTS idx_pr_state_created;',
    'DROP INDEX IF EXISTS idx_pr_repo_created;',
  ],
};
