/**
 * Migration 005: Add body column to pull_requests table
 * Stores PR description text for quality metrics and documentation analysis
 */

import type { Migration } from './Migration';

const migration005: Migration = {
  version: 5,
  description: 'Add body column to pull_requests table',
  up: [`ALTER TABLE pull_requests ADD COLUMN body TEXT NOT NULL DEFAULT '';`],
  down: [`ALTER TABLE pull_requests DROP COLUMN body;`],
};

export default migration005;
