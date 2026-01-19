/**
 * Migration 010: Add pull_request_id column to commits table
 * Links commits to their PRs for tracking commit activity within PRs
 */

import type { Migration } from './Migration';

const migration010: Migration = {
  version: 10,
  description: 'Add pull_request_id column to commits table',
  up: [
    `ALTER TABLE commits ADD COLUMN pull_request_id INTEGER REFERENCES pull_requests(id);`,
    `CREATE INDEX IF NOT EXISTS idx_commit_pr ON commits(pull_request_id);`,
  ],
  down: [`DROP INDEX IF EXISTS idx_commit_pr;`, `ALTER TABLE commits DROP COLUMN pull_request_id;`],
};

export default migration010;
