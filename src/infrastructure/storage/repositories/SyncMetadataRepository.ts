/**
 * Sync Metadata Repository
 * Handles tracking of synchronization state
 */

import type Database from 'better-sqlite3';
import { z } from 'zod';

export type ResourceType = 'pull_requests' | 'reviews' | 'comments';

export interface SyncMetadata {
  id: number;
  resourceType: ResourceType;
  organization: string;
  repository: string | null;
  lastSyncAt: Date;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  itemsSynced: number;
}

/**
 * Database row schema for sync metadata
 */
const DBSyncMetadataSchema = z.object({
  id: z.number(),
  resource_type: z.enum(['pull_requests', 'reviews', 'comments']),
  organization: z.string(),
  repository: z.string().nullable(),
  last_sync_at: z.string(),
  date_range_start: z.string().nullable(),
  date_range_end: z.string().nullable(),
  items_synced: z.number(),
});

type DBSyncMetadata = z.infer<typeof DBSyncMetadataSchema>;

export class SyncMetadataRepository {
  constructor(private db: Database.Database) {}

  /**
   * Convert database row to domain model
   */
  private toDomain(row: DBSyncMetadata): SyncMetadata {
    return {
      id: row.id,
      resourceType: row.resource_type,
      organization: row.organization,
      repository: row.repository,
      lastSyncAt: new Date(row.last_sync_at),
      dateRangeStart: row.date_range_start ? new Date(row.date_range_start) : null,
      dateRangeEnd: row.date_range_end ? new Date(row.date_range_end) : null,
      itemsSynced: row.items_synced,
    };
  }

  /**
   * Save or update sync metadata
   */
  save(metadata: Omit<SyncMetadata, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (
        resource_type, organization, repository,
        last_sync_at, date_range_start, date_range_end, items_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(resource_type, organization, repository) DO UPDATE SET
        last_sync_at = excluded.last_sync_at,
        date_range_start = excluded.date_range_start,
        date_range_end = excluded.date_range_end,
        items_synced = excluded.items_synced
    `);

    stmt.run(
      metadata.resourceType,
      metadata.organization,
      metadata.repository,
      metadata.lastSyncAt.toISOString(),
      metadata.dateRangeStart?.toISOString() ?? null,
      metadata.dateRangeEnd?.toISOString() ?? null,
      metadata.itemsSynced
    );
  }

  /**
   * Get last sync for a resource type and organization
   */
  getLastSync(
    resourceType: ResourceType,
    organization: string,
    repository?: string
  ): SyncMetadata | null {
    const query = repository
      ? 'SELECT * FROM sync_metadata WHERE resource_type = ? AND organization = ? AND repository = ?'
      : 'SELECT * FROM sync_metadata WHERE resource_type = ? AND organization = ? AND repository IS NULL';

    const params = repository
      ? [resourceType, organization, repository]
      : [resourceType, organization];
    const row = this.db.prepare(query).get(...params);

    if (!row) return null;

    const parsed = DBSyncMetadataSchema.parse(row);
    return this.toDomain(parsed);
  }

  /**
   * Get all sync metadata for an organization
   */
  findByOrganization(organization: string): SyncMetadata[] {
    const rows = this.db
      .prepare('SELECT * FROM sync_metadata WHERE organization = ? ORDER BY last_sync_at DESC')
      .all(organization);

    return rows.map((row) => this.toDomain(DBSyncMetadataSchema.parse(row)));
  }

  /**
   * Get all unique repositories that have been synced
   */
  getRepositories(organization: string): string[] {
    const RepositorySchema = z.object({ repository: z.string() });
    const rows = this.db
      .prepare(
        'SELECT DISTINCT repository FROM sync_metadata WHERE organization = ? AND repository IS NOT NULL ORDER BY repository'
      )
      .all(organization);

    return rows.map((row) => RepositorySchema.parse(row).repository);
  }

  /**
   * Get sync metadata for a specific repository grouped by resource type
   */
  findByRepository(organization: string, repository: string): SyncMetadata[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM sync_metadata WHERE organization = ? AND repository = ? ORDER BY resource_type'
      )
      .all(organization, repository);

    return rows.map((row) => this.toDomain(DBSyncMetadataSchema.parse(row)));
  }

  /**
   * Check if a resource was synced recently (within hours)
   */
  isSyncRecent(
    resourceType: ResourceType,
    organization: string,
    maxAgeHours: number,
    repository?: string
  ): boolean {
    const lastSync = this.getLastSync(resourceType, organization, repository);
    if (!lastSync) return false;

    const ageMs = Date.now() - lastSync.lastSyncAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return ageHours < maxAgeHours;
  }

  /**
   * Delete sync metadata
   */
  delete(resourceType: ResourceType, organization: string, repository?: string): void {
    const query = repository
      ? 'DELETE FROM sync_metadata WHERE resource_type = ? AND organization = ? AND repository = ?'
      : 'DELETE FROM sync_metadata WHERE resource_type = ? AND organization = ? AND repository IS NULL';

    const params = repository
      ? [resourceType, organization, repository]
      : [resourceType, organization];
    this.db.prepare(query).run(...params);
  }

  /**
   * Delete all sync metadata for an organization
   */
  deleteByOrganization(organization: string): void {
    this.db.prepare('DELETE FROM sync_metadata WHERE organization = ?').run(organization);
  }
}
