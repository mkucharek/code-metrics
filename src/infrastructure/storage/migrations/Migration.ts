/**
 * Migration System
 * Handles database schema versioning and migrations
 */

import type Database from 'better-sqlite3';
import {
  VersionResultSchema,
  MigrationResultSchema,
  validateQueryResult,
  validateQueryResults,
} from '../query-schemas';

export interface Migration {
  /** Migration version number */
  version: number;

  /** Migration description */
  description: string;

  /** SQL statements to apply the migration */
  up: string[];

  /** SQL statements to revert the migration (optional) */
  down?: string[];
}

/**
 * Migrations table schema
 */
const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Get current database version
 */
export function getCurrentVersion(db: Database.Database): number {
  // Ensure migrations table exists
  db.exec(MIGRATIONS_TABLE);

  const rawResult = db.prepare('SELECT MAX(version) as version FROM migrations').get();
  const result = validateQueryResult(VersionResultSchema, rawResult);

  return result.version ?? 0;
}

/**
 * Apply a migration
 */
export function applyMigration(db: Database.Database, migration: Migration): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion >= migration.version) {
    return; // Migration already applied
  }

  const transaction = db.transaction(() => {
    // Execute migration statements
    for (const statement of migration.up) {
      db.exec(statement);
    }

    // Record migration
    db.prepare('INSERT INTO migrations (version, description) VALUES (?, ?)').run(
      migration.version,
      migration.description
    );
  });

  transaction();
}

/**
 * Apply multiple migrations in order
 */
export function applyMigrations(db: Database.Database, migrations: Migration[]): void {
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pendingMigrations) {
    console.log(`Applying migration ${migration.version}: ${migration.description}`);
    applyMigration(db, migration);
  }

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date');
  } else {
    console.log(`Applied ${pendingMigrations.length} migration(s)`);
  }
}

/**
 * Get all applied migrations
 */
export function getAppliedMigrations(db: Database.Database): Array<{
  version: number;
  description: string;
  appliedAt: string;
}> {
  db.exec(MIGRATIONS_TABLE);

  const rawResults = db
    .prepare(
      'SELECT version, description, applied_at as appliedAt FROM migrations ORDER BY version'
    )
    .all();

  return validateQueryResults(MigrationResultSchema, rawResults);
}
