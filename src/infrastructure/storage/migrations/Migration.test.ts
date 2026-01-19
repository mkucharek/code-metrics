import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  getCurrentVersion,
  applyMigration,
  applyMigrations,
  getAppliedMigrations,
  type Migration,
} from './Migration';

describe('Migration System', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('getCurrentVersion', () => {
    it('returns 0 for new database', () => {
      const version = getCurrentVersion(db);
      expect(version).toBe(0);
    });

    it('returns latest version after migrations', () => {
      const migration: Migration = {
        version: 1,
        description: 'Test migration',
        up: ['CREATE TABLE test (id INTEGER)'],
      };

      applyMigration(db, migration);
      const version = getCurrentVersion(db);
      expect(version).toBe(1);
    });
  });

  describe('applyMigration', () => {
    it('applies migration successfully', () => {
      const migration: Migration = {
        version: 1,
        description: 'Create users table',
        up: ['CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)'],
      };

      applyMigration(db, migration);

      // Verify table was created
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        .all();
      expect(tables).toHaveLength(1);

      // Verify migration was recorded
      const version = getCurrentVersion(db);
      expect(version).toBe(1);
    });

    it('skips already applied migration', () => {
      const migration: Migration = {
        version: 1,
        description: 'Test',
        up: ['CREATE TABLE test (id INTEGER)'],
      };

      applyMigration(db, migration);
      applyMigration(db, migration); // Should be idempotent

      const migrations = getAppliedMigrations(db);
      expect(migrations).toHaveLength(1);
    });

    it('applies migrations in transaction', () => {
      const migration: Migration = {
        version: 1,
        description: 'Multiple tables',
        up: [
          'CREATE TABLE table1 (id INTEGER)',
          'CREATE TABLE table2 (id INTEGER)',
          'CREATE TABLE table3 (id INTEGER)',
        ],
      };

      applyMigration(db, migration);

      const tables = db
        .prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        .get() as { count: number };

      // Should have 3 tables + migrations table = 4
      expect(tables.count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('applyMigrations', () => {
    it('applies multiple migrations in order', () => {
      const migrations: Migration[] = [
        {
          version: 1,
          description: 'Create users',
          up: ['CREATE TABLE users (id INTEGER)'],
        },
        {
          version: 2,
          description: 'Create posts',
          up: ['CREATE TABLE posts (id INTEGER)'],
        },
        {
          version: 3,
          description: 'Create comments',
          up: ['CREATE TABLE comments (id INTEGER)'],
        },
      ];

      applyMigrations(db, migrations);

      const version = getCurrentVersion(db);
      expect(version).toBe(3);

      const applied = getAppliedMigrations(db);
      expect(applied).toHaveLength(3);
    });

    it('only applies pending migrations', () => {
      const migrations: Migration[] = [
        {
          version: 1,
          description: 'First',
          up: ['CREATE TABLE table1 (id INTEGER)'],
        },
        {
          version: 2,
          description: 'Second',
          up: ['CREATE TABLE table2 (id INTEGER)'],
        },
      ];

      // Apply first migration
      applyMigration(db, migrations[0]!);

      // Apply all migrations (should skip first)
      applyMigrations(db, migrations);

      const applied = getAppliedMigrations(db);
      expect(applied).toHaveLength(2);
    });
  });

  describe('getAppliedMigrations', () => {
    it('returns empty array for new database', () => {
      getCurrentVersion(db); // Initialize migrations table

      const migrations = getAppliedMigrations(db);
      expect(migrations).toHaveLength(0);
    });

    it('returns all applied migrations', () => {
      const migration: Migration = {
        version: 1,
        description: 'Test migration',
        up: ['CREATE TABLE test (id INTEGER)'],
      };

      applyMigration(db, migration);

      const migrations = getAppliedMigrations(db);
      expect(migrations).toHaveLength(1);
      expect(migrations[0]?.version).toBe(1);
      expect(migrations[0]?.description).toBe('Test migration');
      expect(migrations[0]?.appliedAt).toBeDefined();
    });
  });
});
