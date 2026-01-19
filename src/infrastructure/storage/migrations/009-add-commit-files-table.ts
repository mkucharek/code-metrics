/**
 * Migration 009: Add commit_files table
 * Stores file-level changes for code ownership and expertise tracking
 */

import type { Migration } from './Migration';
import { COMMIT_FILES_TABLE, COMMIT_FILES_INDEXES } from '../schemas/commit-files';

const migration009: Migration = {
  version: 9,
  description: 'Add commit_files table for file-level tracking',
  up: [COMMIT_FILES_TABLE, COMMIT_FILES_INDEXES],
  down: [`DROP TABLE IF EXISTS commit_files;`],
};

export default migration009;
