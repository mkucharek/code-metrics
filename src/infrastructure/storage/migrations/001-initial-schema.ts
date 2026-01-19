/**
 * Migration 001: Initial Schema
 * Creates all initial database tables and indexes
 */

import type { Migration } from './Migration';
import { ALL_TABLES } from '../schemas';

export const migration001: Migration = {
  version: 1,
  description: 'Initial schema with pull_requests, reviews, comments, and sync_metadata tables',
  up: ALL_TABLES,
  down: [
    'DROP INDEX IF EXISTS idx_sync_type_org',
    'DROP INDEX IF EXISTS idx_sync_org',
    'DROP TABLE IF EXISTS sync_metadata',
    'DROP INDEX IF EXISTS idx_comment_review',
    'DROP INDEX IF EXISTS idx_comment_author_created',
    'DROP INDEX IF EXISTS idx_comment_created_at',
    'DROP INDEX IF EXISTS idx_comment_author',
    'DROP INDEX IF EXISTS idx_comment_pr',
    'DROP TABLE IF EXISTS comments',
    'DROP INDEX IF EXISTS idx_review_reviewer_submitted',
    'DROP INDEX IF EXISTS idx_review_submitted_at',
    'DROP INDEX IF EXISTS idx_review_reviewer',
    'DROP INDEX IF EXISTS idx_review_pr',
    'DROP TABLE IF EXISTS reviews',
    'DROP INDEX IF EXISTS idx_pr_author_created',
    'DROP INDEX IF EXISTS idx_pr_state',
    'DROP INDEX IF EXISTS idx_pr_created_at',
    'DROP INDEX IF EXISTS idx_pr_repository',
    'DROP INDEX IF EXISTS idx_pr_author',
    'DROP TABLE IF EXISTS pull_requests',
  ],
};
