---
title: Migrate Sync Metadata to Per-Day Tracking
category: architecture-refactoring
component:
  - GitHubSynchronizer
  - SyncMetadataRepository
  - DailySyncMetadataRepository
  - SyncService
tags:
  - sync-tracking
  - data-loss-prevention
  - refactoring
  - incremental-sync
  - technical-debt
severity: high
detection_method: |
  Data appeared to be "dropped" between syncs because sync metadata tracked
  only the last sync date range per repository. The `check` command showed
  incomplete coverage.
date_solved: 2026-01-22
---

# Migrate Sync Metadata to Per-Day Tracking

## Problem Statement

The legacy `sync_metadata` table only stored **the last sync** per repository, overwriting previous entries with each sync operation. This design had critical flaws:

1. **Data Loss Illusion** - Running `check` after a sync showed the last sync time from a potentially incomplete sync
2. **No Incremental Sync** - Unable to determine which specific days had been synced
3. **Poor Visibility** - Impossible to track sync progress or understand coverage gaps
4. **Error Recovery** - Failed syncs would still overwrite metadata

### Symptoms

- Syncing 2025-01-01 to 2025-01-05, then 2025-01-03 to 2025-01-10 lost track of 2025-01-01 to 2025-01-02
- Data appeared to be "dropped" because overlapping syncs reset the metadata
- The `check` command showed incorrect coverage information

### Root Cause

The legacy schema stored only a single row per repository:

```sql
-- LEGACY (broken)
sync_metadata(
  resource_type,
  organization,
  repository,
  last_sync_at,        -- Overwrites on every sync!
  date_range_start,    -- Only tracked the latest range
  date_range_end
)
-- ON CONFLICT DO UPDATE SET... destroyed history
```

Each sync operation would overwrite the single row, destroying the history of which individual days were synced.

## Solution

### 1. Removed Legacy Dependencies

**GitHubSynchronizer.ts:**
- Removed `SyncMetadataRepository` from constructor
- Removed fallback cache check: `syncMetadataRepository.getLastSync()`
- Removed legacy save: `syncMetadataRepository.save()`
- Made `dailySyncMetadataRepository` required (no longer optional)

**Before:**
```typescript
constructor(
  // ...
  private syncMetadataRepository: SyncMetadataRepository,      // REMOVED
  private dailySyncMetadataRepository?: DailySyncMetadataRepository  // Was optional
) {}
```

**After:**
```typescript
constructor(
  // ...
  private dailySyncMetadataRepository: DailySyncMetadataRepository  // Required
) {}
```

### 2. Simplified Sync Logic

Removed the legacy fallback branch that checked `syncMetadataRepository.getLastSync()`:

**Before:**
```typescript
if (this.dailySyncMetadataRepository && !options.force) {
  // Per-day sync logic
} else {
  // Legacy fallback - checked syncMetadataRepository.getLastSync()
}
```

**After:**
```typescript
if (options.force) {
  // Force mode: sync all days
  daysToSync.push(...allDays);
} else {
  // Check which days are already synced
  const syncedDays = this.dailySyncMetadataRepository.getSyncedDays(...);
  // Only sync missing days
}
```

### 3. Updated SyncService

**getSyncedRepositories()** - Now uses daily sync metadata:
```typescript
getSyncedRepositories(): string[] {
  const dailySyncRepo = new DailySyncMetadataRepository(db);
  const summary = dailySyncRepo.getSyncSummary(org);

  const repos = new Set<string>();
  for (const entry of summary) {
    repos.add(entry.repository);
  }
  return Array.from(repos).sort();
}
```

**getRepositorySyncInfo()** - Derives range from daily data:
```typescript
getRepositorySyncInfo(repository: string) {
  const coverage = dailySyncRepo.getDateRangeCoverage('pull_requests', org, repo);
  const lastSyncAt = dailySyncRepo.getLastSyncAt('pull_requests', org, repo);

  return [{
    dateRangeStart: new Date(coverage.minDate),
    dateRangeEnd: new Date(coverage.maxDate),
    lastSyncAt,
    itemsSynced: coverage.dayCount,
  }];
}
```

### 4. Added New Repository Method

**DailySyncMetadataRepository.getLastSyncAt():**
```typescript
getLastSyncAt(resourceType, org, repo): Date | null {
  const row = this.db.prepare(`
    SELECT MAX(synced_at) as synced_at
    FROM daily_sync_metadata
    WHERE resource_type = ? AND organization = ? AND repository = ?
  `).get(resourceType, org, repo);

  return row?.synced_at ? new Date(row.synced_at) : null;
}
```

## Files Changed

| File | Changes |
|------|---------|
| `src/infrastructure/github/GitHubSynchronizer.ts` | Removed SyncMetadataRepository dependency, simplified sync logic |
| `src/application/services/SyncService.ts` | Updated to use daily sync data exclusively |
| `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts` | Added `getLastSyncAt()` method |
| `src/infrastructure/github/GitHubSynchronizer.test.ts` | Removed 7 legacy tests |

## Prevention Strategies

### Design for History, Not Just State

**Anti-pattern:**
```sql
-- Single row per entity - overwrites history
CREATE TABLE sync_state (
  repository TEXT PRIMARY KEY,
  last_sync_at TEXT
);
```

**Pattern:**
```sql
-- One row per day - preserves history
CREATE TABLE daily_sync_metadata (
  repository TEXT,
  sync_date TEXT,           -- YYYY-MM-DD granularity
  synced_at TEXT,
  UNIQUE(repository, sync_date)
);
```

### Use Composite Keys for Granularity

Include time dimensions in unique constraints to enable incremental operations.

### Version Your Metadata Tables

Create new tables alongside old ones for safe migration. The `daily_sync_metadata` table was added via Migration 011 while `sync_metadata` remained for backwards compatibility.

## Database Reset Instructions

If you need to start fresh after this refactoring:

```bash
# Option 1: Delete database file (full reset)
rm ~/.code-metrics/metrics.db

# Option 2: Clear just the daily sync metadata
sqlite3 ~/.code-metrics/metrics.db "DELETE FROM daily_sync_metadata;"

# Then run a fresh sync
pnpm dev sync --since 30
```

## Benefits

1. **True Incremental Sync** - Only fetch days not yet synced
2. **Error Resilience** - Failed syncs don't corrupt sync state
3. **Better Visibility** - See which days have gaps via `check --data`
4. **API Efficiency** - Batch contiguous days into single API calls
5. **Audit Trail** - Full history of which days were synced when

## Related Documentation

- `/plans/feat-incremental-per-day-sync.md` - Original implementation plan
- `/backlog/docs/doc-001 - Architecture.md` - System architecture
- `/backlog/docs/doc-002 - GitHub API Integration Guide.md` - API integration details
- `/src/infrastructure/storage/migrations/011-add-daily-sync-metadata.ts` - Migration

## Testing

All 222 tests pass after this refactoring. 7 legacy tests that specifically tested `SyncMetadataRepository` behavior were removed as they're no longer applicable.
