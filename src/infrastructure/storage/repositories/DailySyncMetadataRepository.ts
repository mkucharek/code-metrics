/**
 * Daily Sync Metadata Repository
 * Tracks which days have been synced for incremental sync support
 */

import type Database from 'better-sqlite3';
import { z } from 'zod';

export type DailyResourceType = 'pull_requests' | 'reviews' | 'comments' | 'commits';

export interface DailySyncMetadata {
  id: number;
  resourceType: DailyResourceType;
  organization: string;
  repository: string;
  syncDate: string; // YYYY-MM-DD in UTC
  syncedAt: Date;
  itemsSynced: number;
}

export type DailySyncMetadataInput = Omit<DailySyncMetadata, 'id'>;

const DBDailySyncMetadataSchema = z.object({
  id: z.number(),
  resource_type: z.enum(['pull_requests', 'reviews', 'comments', 'commits']),
  organization: z.string(),
  repository: z.string(),
  sync_date: z.string(),
  synced_at: z.string(),
  items_synced: z.number(),
});

type DBDailySyncMetadata = z.infer<typeof DBDailySyncMetadataSchema>;

export class DailySyncMetadataRepository {
  // Static Zod schemas - compiled once, reused for all method calls
  private static readonly SyncDateSchema = z.object({ sync_date: z.string() });
  private static readonly SummarySchema = z.object({
    repository: z.string(),
    resource_type: z.enum(['pull_requests', 'reviews', 'comments', 'commits']),
    day_count: z.number(),
    total_items: z.number(),
  });
  private static readonly CoverageSchema = z.object({
    min_date: z.string(),
    max_date: z.string(),
    day_count: z.number(),
  });

  constructor(private db: Database.Database) {}

  private toDomain(row: DBDailySyncMetadata): DailySyncMetadata {
    return {
      id: row.id,
      resourceType: row.resource_type,
      organization: row.organization,
      repository: row.repository,
      syncDate: row.sync_date,
      syncedAt: new Date(row.synced_at),
      itemsSynced: row.items_synced,
    };
  }

  /**
   * Save or update a daily sync record
   */
  save(metadata: DailySyncMetadataInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO daily_sync_metadata (
        resource_type, organization, repository, sync_date,
        synced_at, items_synced
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(resource_type, organization, repository, sync_date) DO UPDATE SET
        synced_at = excluded.synced_at,
        items_synced = excluded.items_synced
    `);

    stmt.run(
      metadata.resourceType,
      metadata.organization,
      metadata.repository,
      metadata.syncDate,
      metadata.syncedAt.toISOString(),
      metadata.itemsSynced
    );
  }

  /**
   * Batch save daily sync records within a transaction
   */
  saveBatch(records: DailySyncMetadataInput[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO daily_sync_metadata (
        resource_type, organization, repository, sync_date,
        synced_at, items_synced
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(resource_type, organization, repository, sync_date) DO UPDATE SET
        synced_at = excluded.synced_at,
        items_synced = excluded.items_synced
    `);

    const insertMany = this.db.transaction((items: DailySyncMetadataInput[]) => {
      for (const record of items) {
        stmt.run(
          record.resourceType,
          record.organization,
          record.repository,
          record.syncDate,
          record.syncedAt.toISOString(),
          record.itemsSynced
        );
      }
    });

    insertMany(records);
  }

  /**
   * Get all synced days for a repository within a date range
   */
  getSyncedDays(
    resourceType: DailyResourceType,
    organization: string,
    repository: string,
    startDate: string,
    endDate: string
  ): string[] {
    const rows = this.db
      .prepare(
        `
      SELECT sync_date FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
        AND sync_date >= ?
        AND sync_date <= ?
      ORDER BY sync_date
    `
      )
      .all(resourceType, organization, repository, startDate, endDate);

    return rows.map((row) => DailySyncMetadataRepository.SyncDateSchema.parse(row).sync_date);
  }

  /**
   * Get all synced days for a repository (no date range filter)
   */
  getAllSyncedDays(
    resourceType: DailyResourceType,
    organization: string,
    repository: string
  ): string[] {
    const rows = this.db
      .prepare(
        `
      SELECT sync_date FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
      ORDER BY sync_date
    `
      )
      .all(resourceType, organization, repository);

    return rows.map((row) => DailySyncMetadataRepository.SyncDateSchema.parse(row).sync_date);
  }

  /**
   * Check if a specific day is synced
   */
  isDaySynced(
    resourceType: DailyResourceType,
    organization: string,
    repository: string,
    syncDate: string
  ): boolean {
    const row = this.db
      .prepare(
        `
      SELECT 1 FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
        AND sync_date = ?
    `
      )
      .get(resourceType, organization, repository, syncDate);

    return row !== undefined;
  }

  /**
   * Get sync metadata for a specific day
   */
  getDay(
    resourceType: DailyResourceType,
    organization: string,
    repository: string,
    syncDate: string
  ): DailySyncMetadata | null {
    const row = this.db
      .prepare(
        `
      SELECT * FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
        AND sync_date = ?
    `
      )
      .get(resourceType, organization, repository, syncDate);

    if (!row) return null;

    const parsed = DBDailySyncMetadataSchema.parse(row);
    return this.toDomain(parsed);
  }

  /**
   * Delete sync records for a date range (for --force resync)
   */
  deleteRange(
    resourceType: DailyResourceType,
    organization: string,
    repository: string,
    startDate: string,
    endDate: string
  ): number {
    const result = this.db
      .prepare(
        `
      DELETE FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
        AND sync_date >= ?
        AND sync_date <= ?
    `
      )
      .run(resourceType, organization, repository, startDate, endDate);

    return result.changes;
  }

  /**
   * Delete all sync records for a repository
   */
  deleteByRepository(
    resourceType: DailyResourceType,
    organization: string,
    repository: string
  ): number {
    const result = this.db
      .prepare(
        `
      DELETE FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
    `
      )
      .run(resourceType, organization, repository);

    return result.changes;
  }

  /**
   * Get summary statistics for synced days across all repositories
   */
  getSyncSummary(organization: string): Array<{
    repository: string;
    resourceType: DailyResourceType;
    dayCount: number;
    totalItems: number;
  }> {
    const rows = this.db
      .prepare(
        `
      SELECT
        repository,
        resource_type,
        COUNT(*) as day_count,
        SUM(items_synced) as total_items
      FROM daily_sync_metadata
      WHERE organization = ?
      GROUP BY repository, resource_type
      ORDER BY repository, resource_type
    `
      )
      .all(organization);

    return rows.map((row) => {
      const parsed = DailySyncMetadataRepository.SummarySchema.parse(row);
      return {
        repository: parsed.repository,
        resourceType: parsed.resource_type,
        dayCount: parsed.day_count,
        totalItems: parsed.total_items,
      };
    });
  }

  /**
   * Get date range coverage for a repository
   * Returns min and max synced dates
   */
  getDateRangeCoverage(
    resourceType: DailyResourceType,
    organization: string,
    repository: string
  ): { minDate: string; maxDate: string; dayCount: number } | null {
    const row = this.db
      .prepare(
        `
      SELECT
        MIN(sync_date) as min_date,
        MAX(sync_date) as max_date,
        COUNT(*) as day_count
      FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
    `
      )
      .get(resourceType, organization, repository);

    if (!row) return null;

    const parsed = DailySyncMetadataRepository.CoverageSchema.safeParse(row);
    if (!parsed.success || !parsed.data.min_date) return null;

    return {
      minDate: parsed.data.min_date,
      maxDate: parsed.data.max_date,
      dayCount: parsed.data.day_count,
    };
  }

  /**
   * Get the most recent sync timestamp for a repository
   */
  getLastSyncAt(
    resourceType: DailyResourceType,
    organization: string,
    repository: string
  ): Date | null {
    const LastSyncSchema = z.object({ synced_at: z.string().nullable() });

    const row = this.db
      .prepare(
        `
      SELECT MAX(synced_at) as synced_at
      FROM daily_sync_metadata
      WHERE resource_type = ?
        AND organization = ?
        AND repository = ?
    `
      )
      .get(resourceType, organization, repository);

    if (!row) return null;

    const parsed = LastSyncSchema.safeParse(row);
    if (!parsed.success || !parsed.data.synced_at) return null;

    return new Date(parsed.data.synced_at);
  }
}
