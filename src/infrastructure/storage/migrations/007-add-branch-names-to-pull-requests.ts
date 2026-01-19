/**
 * Migration 007: Add head_branch and base_branch columns to pull_requests table
 * Tracks source and target branches for branch strategy analysis
 */

import type { Migration } from './Migration';

const migration007: Migration = {
  version: 7,
  description: 'Add head_branch and base_branch columns to pull_requests table',
  up: [
    `ALTER TABLE pull_requests ADD COLUMN head_branch TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE pull_requests ADD COLUMN base_branch TEXT NOT NULL DEFAULT '';`,
  ],
  down: [
    `ALTER TABLE pull_requests DROP COLUMN head_branch;`,
    `ALTER TABLE pull_requests DROP COLUMN base_branch;`,
  ],
};

export default migration007;
