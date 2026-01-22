/**
 * Migration 011: Add daily_sync_metadata table
 * Enables per-day sync tracking for incremental syncs
 */

import type { Migration } from './Migration';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS daily_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('pull_requests', 'reviews', 'comments', 'commits')),
  organization TEXT NOT NULL,
  repository TEXT NOT NULL,
  sync_date TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  items_synced INTEGER NOT NULL DEFAULT 0,
  UNIQUE(resource_type, organization, repository, sync_date)
);
`;

const CREATE_INDEX = `
CREATE INDEX IF NOT EXISTS idx_daily_sync_lookup
  ON daily_sync_metadata(resource_type, organization, repository, sync_date);
`;

const migration011: Migration = {
  version: 11,
  description: 'Add daily_sync_metadata table for per-day sync tracking',
  up: [CREATE_TABLE, CREATE_INDEX],
  down: [`DROP TABLE IF EXISTS daily_sync_metadata;`],
};

export default migration011;
