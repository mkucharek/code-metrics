/**
 * Migration 003: Add commits and repository_metadata tables
 * Adds commit tracking and repository metadata caching for default branch
 */

import type { Migration } from './Migration';
import {
  COMMITS_TABLE,
  COMMITS_INDEXES,
  REPOSITORY_METADATA_TABLE,
  REPOSITORY_METADATA_INDEXES,
} from '../schemas';

const migration003: Migration = {
  version: 3,
  description: 'Add commits and repository_metadata tables',
  up: [COMMITS_TABLE, COMMITS_INDEXES, REPOSITORY_METADATA_TABLE, REPOSITORY_METADATA_INDEXES],
  down: ['DROP TABLE IF EXISTS commits;', 'DROP TABLE IF EXISTS repository_metadata;'],
};

export default migration003;
