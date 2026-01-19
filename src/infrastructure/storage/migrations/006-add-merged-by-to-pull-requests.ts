/**
 * Migration 006: Add merged_by column to pull_requests table
 * Tracks who merged the PR (useful for shepherding/mentorship patterns)
 */

import type { Migration } from './Migration';

const migration006: Migration = {
  version: 6,
  description: 'Add merged_by column to pull_requests table',
  up: [`ALTER TABLE pull_requests ADD COLUMN merged_by TEXT;`],
  down: [`ALTER TABLE pull_requests DROP COLUMN merged_by;`],
};

export default migration006;
