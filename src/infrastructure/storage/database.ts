/**
 * Database Module
 * Handles SQLite database initialization and management
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface DatabaseConfig {
  /** Path to the database file */
  path: string;

  /** Whether to enable verbose logging */
  verbose?: boolean;

  /** Whether to use WAL mode (recommended for better concurrency) */
  walMode?: boolean;
}

/**
 * Initialize SQLite database
 * Creates the database file and directory if they don't exist
 */
export function initializeDatabase(config: DatabaseConfig): Database.Database {
  // Ensure directory exists
  const dir = dirname(config.path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Create database connection
  const db = new Database(config.path, {
    verbose: config.verbose ? console.log : undefined,
  });

  // Enable WAL mode for better concurrency
  if (config.walMode !== false) {
    db.pragma('journal_mode = WAL');
  }

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Set reasonable cache size (10MB)
  db.pragma('cache_size = -10000');

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}

/**
 * Execute multiple SQL statements in a transaction
 */
export function executeTransaction(db: Database.Database, statements: string[]): void {
  const transaction = db.transaction(() => {
    for (const statement of statements) {
      db.exec(statement);
    }
  });

  transaction();
}
