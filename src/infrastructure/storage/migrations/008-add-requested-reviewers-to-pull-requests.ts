/**
 * Migration 008: Add requested_reviewers column to pull_requests table
 * Tracks who was asked to review the PR (useful for workload distribution analysis)
 */

import type { Migration } from './Migration';

const migration008: Migration = {
  version: 8,
  description: 'Add requested_reviewers column to pull_requests table',
  up: [`ALTER TABLE pull_requests ADD COLUMN requested_reviewers TEXT NOT NULL DEFAULT '[]';`],
  down: [`ALTER TABLE pull_requests DROP COLUMN requested_reviewers;`],
};

export default migration008;
