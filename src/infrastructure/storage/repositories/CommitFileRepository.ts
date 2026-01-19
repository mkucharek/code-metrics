/**
 * CommitFile Repository
 * Data access layer for commit files
 */

import type Database from 'better-sqlite3';
import type { CommitFile } from '../../../domain/models';
import { z } from 'zod';

/**
 * Database schema for commit files
 */
const DBCommitFileSchema = z.object({
  commit_sha: z.string(),
  repository: z.string(),
  filename: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
});

type DBCommitFile = z.infer<typeof DBCommitFileSchema>;

export class CommitFileRepository {
  constructor(private db: Database.Database) {}

  /**
   * Save a commit file to the database
   */
  save(file: CommitFile): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO commit_files (
        commit_sha, repository, filename, status, additions, deletions
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        file.commitSha,
        file.repository,
        file.filename,
        file.status,
        file.additions,
        file.deletions
      );
  }

  /**
   * Save multiple commit files in a transaction
   */
  saveBatch(files: CommitFile[]): void {
    const transaction = this.db.transaction((filesToSave: CommitFile[]) => {
      for (const file of filesToSave) {
        this.save(file);
      }
    });

    transaction(files);
  }

  /**
   * Find files by commit SHA
   */
  findByCommit(commitSha: string, repository: string): CommitFile[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commit_files
      WHERE commit_sha = ? AND repository = ?
      ORDER BY filename
    `
      )
      .all(commitSha, repository);

    return rows.map((row) => this.toDomain(DBCommitFileSchema.parse(row)));
  }

  /**
   * Find commits that modified a specific file
   */
  findByFilename(filename: string, repository: string): CommitFile[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM commit_files
      WHERE filename = ? AND repository = ?
      ORDER BY commit_sha DESC
    `
      )
      .all(filename, repository);

    return rows.map((row) => this.toDomain(DBCommitFileSchema.parse(row)));
  }

  /**
   * Convert database record to domain model
   */
  private toDomain(dbFile: DBCommitFile): CommitFile {
    return {
      commitSha: dbFile.commit_sha,
      repository: dbFile.repository,
      filename: dbFile.filename,
      status: dbFile.status,
      additions: dbFile.additions,
      deletions: dbFile.deletions,
    };
  }
}
