/**
 * Migration 004: Add parent_count column to commits table
 * Adds parent_count field to distinguish merge commits (2+ parents) from regular commits
 */

import type { Migration } from './Migration';

const migration004: Migration = {
  version: 4,
  description: 'Add parent_count column to commits table',
  up: [`ALTER TABLE commits ADD COLUMN parent_count INTEGER NOT NULL DEFAULT 1;`],
  down: [`ALTER TABLE commits DROP COLUMN parent_count;`],
};

export default migration004;
