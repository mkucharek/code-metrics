---
id: doc-006
title: 'Sync Metadata Refactoring: Prevention Strategies & Best Practices'
type: other
created_date: '2026-01-22 09:01'
---
# Sync Metadata Refactoring: Prevention Strategies & Best Practices

## Executive Summary

The original sync metadata design had critical limitations: it stored only the last sync timestamp per resource type and organization, making it impossible to track which specific days had been synced. This prevented incremental syncing by date range and created gaps in data collection.

The refactoring introduced `daily_sync_metadata` table to track per-day syncs while maintaining backward compatibility with the legacy `sync_metadata` table.

## The Problem: Legacy Sync Metadata Design

### What Was Wrong

**Original Schema (sync_metadata table):**
```sql
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL,
  organization TEXT NOT NULL,
  repository TEXT,
  last_sync_at TEXT NOT NULL,              -- Only timestamp
  date_range_start TEXT,
  date_range_end TEXT,
  items_synced INTEGER NOT NULL DEFAULT 0,
  UNIQUE(resource_type, organization, repository)
);
```

**Key Issues:**
1. **Temporal Blindness**: Only `last_sync_at` was tracked. No record of which intermediate days were synced.
2. **No Sync History**: Overwrote previous values. If a sync failed partway through dates 2025-01-10 to 2025-01-20, there was no way to know which days succeeded.
3. **Gap Detection Impossible**: Couldn't determine if there were unsynced days in a date range without re-querying GitHub.
4. **All-or-Nothing Resync**: Couldn't selectively resync only failed days. Had to resync entire ranges.
5. **Accumulated Over Time**: As features evolved, the limitations became increasingly apparent, causing technical debt.

### Why This Happened

This is a common pattern in evolving systems:
- **Initial simplicity**: When sync was first built, tracking one timestamp seemed sufficient
- **Incremental feature growth**: Requirements for date ranges and incremental syncs were added later
- **Legacy compatibility**: The old schema couldn't be easily replaced without data migration
- **Deferred refactoring**: Technical debt accumulated as workarounds replaced proper solutions

## Solution: Per-Day Sync Metadata

### New Schema (daily_sync_metadata table)

```sql
CREATE TABLE daily_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('pull_requests', 'reviews', 'comments', 'commits')),
  organization TEXT NOT NULL,
  repository TEXT NOT NULL,
  sync_date TEXT NOT NULL,                -- YYYY-MM-DD UTC
  synced_at TEXT NOT NULL,                -- ISO timestamp
  items_synced INTEGER NOT NULL DEFAULT 0,
  UNIQUE(resource_type, organization, repository, sync_date)
);

CREATE INDEX idx_daily_sync_lookup
  ON daily_sync_metadata(resource_type, organization, repository, sync_date);
```

### Key Benefits

1. **Complete History**: Every synced day is recorded
2. **Gap Detection**: Can query which days are missing in a range
3. **Selective Resync**: Only resync specific failed dates
4. **Append-Only Pattern**: New days added, old ones never deleted (except for --force)
5. **Accurate Statistics**: Sum items synced across days to get totals
6. **Timeline Reconstruction**: Can audit what happened on each day

## Prevention Strategies

### 1. Design for History, Not Just State

**Anti-Pattern:**
```typescript
// ❌ DON'T: Store only current state
interface SyncMetadata {
  lastSyncAt: Date;
  itemsSynced: number;  // Always overwritten
}
```

**Pattern:**
```typescript
// ✅ DO: Store immutable historical records
interface DailySyncRecord {
  syncDate: string;      // YYYY-MM-DD (immutable key)
  syncedAt: Date;        // When it happened
  itemsSynced: number;   // Count for this day
}

// Query history, not just state
const coverage = getSyncedDays('pull_requests', org, repo, start, end);
// Returns: ['2025-01-10', '2025-01-12', '2025-01-15'] (gaps visible!)
```

### 2. Composite Keys for Granularity

**Anti-Pattern:**
```typescript
// ❌ DON'T: Single level of granularity
UNIQUE(resource_type, organization, repository)  // Can't distinguish days
```

**Pattern:**
```typescript
// ✅ DO: Include time-based keys for per-period tracking
UNIQUE(resource_type, organization, repository, sync_date)  // Each day tracked
```

**Apply this principle:**
- If you need hourly granularity later, include `HOUR`
- If you need per-run tracking, include `run_id`
- Always add finer granularity than you think you need now

### 3. Version Your Metadata Tables

**Anti-Pattern:**
```typescript
// ❌ DON'T: Update schema in-place
ALTER TABLE sync_metadata ADD new_column ...  // Can break existing queries
```

**Pattern:**
```typescript
// ✅ DO: Create versioned tables, migrate data
// v1: sync_metadata (legacy)
// v2: daily_sync_metadata (new)
// Both coexist during transition

// Migration handles data preservation
const migration011: Migration = {
  up: [CREATE_TABLE, CREATE_INDEX],
  down: [`DROP TABLE IF EXISTS daily_sync_metadata;`],
};

// Can roll back safely
```

**Benefit:** Two versions let you:
- Test new schema without breaking old code
- Run old and new systems in parallel
- Gradually migrate clients to new schema
- Detect integration issues early

### 4. Include Timestamps for Debugging

**Anti-Pattern:**
```typescript
// ❌ Minimal tracking
sync_date TEXT NOT NULL  // Only when data was for
```

**Pattern:**
```typescript
// ✅ Include execution timestamp
sync_date TEXT NOT NULL,      // YYYY-MM-DD (what period)
synced_at TEXT NOT NULL,      // ISO timestamp (when we ran it)

// Now you can debug:
// - "Were syncs slow today?" (synced_at - sync_date gap)
// - "What ran during maintenance window?" (synced_at filter)
// - "Is data stale?" (compare synced_at to now)
```

### 5. Design for Idempotency (UPSERT Pattern)

**Anti-Pattern:**
```typescript
// ❌ Duplicates or errors on re-run
INSERT INTO sync_metadata (...)  // Fails if day already synced
```

**Pattern:**
```typescript
// ✅ Safe re-runs with UPSERT
INSERT INTO daily_sync_metadata (
  resource_type, organization, repository, sync_date,
  synced_at, items_synced
) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(resource_type, organization, repository, sync_date) 
  DO UPDATE SET
    synced_at = excluded.synced_at,
    items_synced = excluded.items_synced;
```

**Why:** Allows safe retries without manual intervention

### 6. Immutable Dates with UTC Standardization

**Anti-Pattern:**
```typescript
// ❌ Different formats, timezone issues
sync_date TEXT  // "Jan 15" or "2025-1-15" or local time?
```

**Pattern:**
```typescript
// ✅ Consistent format, clear semantics
sync_date TEXT NOT NULL,  // YYYY-MM-DD UTC (immutable, no time component)
synced_at TEXT NOT NULL,  // ISO 8601 UTC timestamp (when we ran it)

// TypeScript enforcement
type SyncDateString = `${number}-${number}-${number}` & { readonly __brand: 'SyncDate' };

// Usage
const syncDate: SyncDateString = '2025-01-15';  // Type-safe
```

### 7. Add Constraints Early

**Anti-Pattern:**
```typescript
// ❌ Loose schema, data quality issues emerge later
CREATE TABLE sync_metadata (
  resource_type TEXT,  -- Can be NULL or garbage
  sync_date TEXT,      -- Can be "Tuesday" or "01/15" 
  items_synced INTEGER -- Can be -5
);
```

**Pattern:**
```typescript
// ✅ Constraints at schema level
CREATE TABLE daily_sync_metadata (
  resource_type TEXT NOT NULL 
    CHECK(resource_type IN ('pull_requests', 'reviews', 'comments', 'commits')),
  sync_date TEXT NOT NULL,  -- Format enforced at application level
  items_synced INTEGER NOT NULL DEFAULT 0
    CHECK(items_synced >= 0),
  UNIQUE(resource_type, organization, repository, sync_date)
);
```

**Prevents:**
- Invalid resource types
- Duplicate records
- Negative counts
- Partial inserts

### 8. Use Batch Operations for Large Syncs

**Anti-Pattern:**
```typescript
// ❌ One insert per day = slow + error-prone
for (const day of syncedDays) {
  repo.save(day);  // Individual transaction each time
}
```

**Pattern:**
```typescript
// ✅ Atomic batch with single transaction
saveBatch(records: DailySyncMetadataInput[]): void {
  const insertMany = this.db.transaction((items) => {
    for (const record of items) {
      stmt.run(...);  // Same statement reused
    }
  });
  insertMany(records);  // One transaction for all
}

// Usage
const recordsForWeek = generateRecords(7);  // 7 days
repo.saveBatch(recordsForWeek);  // Atomic insert
```

**Benefits:**
- Single transaction = all-or-nothing
- Prepared statement reuse = faster
- No partial states
- Easier to retry

### 9. Provide Query Helpers for Common Patterns

**Anti-Pattern:**
```typescript
// ❌ Raw SQL scattered everywhere
const days = db.prepare('SELECT sync_date FROM daily_sync_metadata WHERE ...')
  .all(...);
```

**Pattern:**
```typescript
// ✅ Encapsulated, reusable query methods
getSyncedDays(resourceType, org, repo, start, end): string[] {
  // Standardized implementation
  // Handles NULL checks, type safety
  // Can be optimized centrally
}

isDaySynced(resourceType, org, repo, syncDate): boolean {
  // Focused query for common check
}

getDateRangeCoverage(resourceType, org, repo) {
  // Returns min/max/count for analysis
}
```

**Benefits:**
- Consistent query patterns
- Centralizes optimization
- Type-safe results
- Easy to add caching

## Database Migration Considerations

### Migration Pattern (Applied in Migration 011)

```typescript
const migration011: Migration = {
  version: 11,
  description: 'Add daily_sync_metadata table for per-day sync tracking',
  up: [
    CREATE_TABLE,      // Creates new structure
    CREATE_INDEX,      // Performance indexes
  ],
  down: [
    'DROP TABLE IF EXISTS daily_sync_metadata;'  // Safe rollback
  ],
};
```

### Key Principles

1. **Separate Concerns**: Data structure (table) from query optimization (index)
2. **Rollback Safety**: Every `up` has corresponding `down`
3. **Idempotent Creation**: Use `IF NOT EXISTS` to allow re-running
4. **Index First**: Create indexes immediately to avoid slow queries on large tables
5. **Version Control**: All migrations tracked in code, not manual SQL

### Handling Large Datasets

**Pattern for backfilling historical data:**

```typescript
// If migrating from old sync_metadata to daily_sync_metadata
// Don't try to reconstruct history (impossible)
// Instead: start fresh with new schema, accept data gap

const migration012_backfill: Migration = {
  version: 12,
  description: 'Backfill daily_sync_metadata from existing PRs',
  up: [
    `INSERT INTO daily_sync_metadata (
      resource_type, organization, repository, 
      sync_date, synced_at, items_synced
    ) SELECT 
      'pull_requests' as resource_type,
      'org' as organization,
      repository,
      DATE(created_at) as sync_date,
      MAX(created_at) as synced_at,
      COUNT(*) as items_synced
    FROM pull_requests
    GROUP BY repository, DATE(created_at);`
  ],
  down: ['DELETE FROM daily_sync_metadata WHERE ...']
};
```

## How to Reset Database After Schema Changes

### Safe Reset Procedure

**Option 1: Full Reset (Development)**

```bash
# 1. Delete database file (completely safe in dev)
rm ~/.config/code-metrics/database.db

# 2. Restart application
# Migrations run automatically
# Database re-initialized with latest schema
```

**Option 2: Selective Table Reset (Production-like)**

```typescript
// In CLI or admin tool
import { DailySyncMetadataRepository } from './repositories';

// Delete all sync metadata for an organization
dailySyncRepo.deleteByOrganization('my-org');

// Or delete for specific repository
dailySyncRepo.deleteByRepository('pull_requests', 'my-org', 'my-repo');

// Or delete date range
dailySyncRepo.deleteRange('pull_requests', 'my-org', 'my-repo', 
  '2025-01-01', '2025-01-31');
```

**Option 3: Partial Reset (Resync specific dates)**

```typescript
// Only resync failed dates without touching successful ones
const recordsToDelete = dailySyncRepo.deleteRange(
  'pull_requests',
  'my-org',
  'my-repo',
  '2025-01-15',  // Failed range start
  '2025-01-17'   // Failed range end
);
// Returns: 3 (deleted 3 day records)

// Now re-sync will cover those dates again
await syncService.sync({
  since: '2025-01-15',
  until: '2025-01-17',
  force: false  // Won't re-sync already successful dates
});
```

### Reset Verification

```typescript
// After reset, verify state
const coverage = syncService.getDailySyncCoverage('my-repo');
console.log('Synced days:', coverage.syncedDays);
console.log('Date range:', coverage.coverage?.minDate, 
            'to', coverage.coverage?.maxDate);
console.log('Day count:', coverage.coverage?.dayCount);
console.log('Gaps:', coverage.gaps);
```

### Preventing Accidental Data Loss

**Recommended: Add confirmation before destructive operations**

```typescript
// Pattern used in CLI
async function resetSyncData(org: string, repo: string): Promise<void> {
  const coverage = syncService.getDailySyncCoverage(repo);
  
  console.log('DANGER: About to delete sync metadata');
  console.log(`Organization: ${org}`);
  console.log(`Repository: ${repo}`);
  console.log(`Synced days: ${coverage.coverage?.dayCount || 0}`);
  console.log(`Date range: ${coverage.coverage?.minDate} to ${coverage.coverage?.maxDate}`);
  
  const confirmed = await askYesNo('Proceed with deletion?');
  if (!confirmed) {
    console.log('Cancelled.');
    return;
  }
  
  dailySyncRepo.deleteByRepository('pull_requests', org, repo);
  console.log('Reset complete.');
}
```

## Best Practices Summary

### Schema Design

| Principle | Anti-Pattern | Pattern | Why |
|-----------|--------------|---------|-----|
| **History** | Store only current state | Append-only daily records | Detect gaps, replay, audit |
| **Granularity** | Single level (org/resource) | Multiple keys (org/resource/repo/date) | Handle failures at any level |
| **Versioning** | Update in-place | Create new tables, migrate | Safe rollback, parallel testing |
| **Timestamps** | Just one datetime | When (sync_date) + When executed (synced_at) | Debug timing and staleness |
| **Idempotence** | INSERT fails on duplicate | UPSERT pattern | Safe retries |
| **Dates** | Any format, any timezone | YYYY-MM-DD UTC (immutable) | No ambiguity, consistency |
| **Constraints** | Trust application layer | CHECK constraints | Database enforces invariants |
| **Queries** | Raw SQL everywhere | Encapsulated query helpers | Consistency, optimization, testability |

### Development Process

1. **Start with conservative schema**: Extra columns are cheap, removing is hard
2. **Include time dimensions early**: Easier to add than retrofit
3. **Use transactions for atomicity**: Batch operations in single transaction
4. **Test migration reversibility**: Both `up` and `down` must work
5. **Version all migrations**: Track in code, never manual SQL
6. **Add indexes immediately**: Don't wait for performance problems
7. **Validate data at boundaries**: Constraints + Zod validation
8. **Provide query helpers**: Encapsulate common patterns

### Operational Safety

1. **Backup before major migrations**: Database file is just a file
2. **Test migrations locally first**: Run full migration sequence
3. **Plan for rollback**: Keep `down` migrations current
4. **Monitor after changes**: Watch query performance, error rates
5. **Document reset procedures**: Make them discoverable and safe
6. **Add audit logging**: Track who/what deleted data
7. **Gradual rollouts**: Test new schema alongside old one

## Real-World Recovery: Migration 011

### What Happened

**Before:**
- `sync_metadata` table only knew "last synced Jan 20"
- No record of which intermediate dates succeeded
- "Did we sync Jan 15?" → Can't tell from database
- "Sync failed partway" → Have to resync everything

**After:**
- `daily_sync_metadata` tracks each day
- "Did we sync Jan 15?" → Direct lookup in database
- "Sync failed Jan 17-19?" → Delete those rows, re-run for those dates only
- Selective resync possible

### Migration Strategy

1. **Created new table** (migration011) while keeping old one
2. **Added new repository** `DailySyncMetadataRepository` with same interface patterns
3. **Updated sync code** to populate daily records
4. **Keep legacy table** for backward compatibility (can be removed later in migration015+)
5. **No data loss** - all existing PRs/reviews/comments untouched

### Timeline

- **Migration 011 UP**: New schema deployed, starts recording daily
- **During development**: Both tables coexist
- **Post-deployment**: Can add reporting, analysis on daily data
- **Later**: Legacy `sync_metadata` can be deprecated with migration015

## Lessons for Future

### Code Review Checklist for Metadata Changes

- [ ] Does schema include time granularity needed?
- [ ] Are there CHECK constraints to prevent invalid data?
- [ ] Is there a UNIQUE key to prevent duplicates?
- [ ] Does it support UPSERT for idempotence?
- [ ] Are there indexes on query predicates?
- [ ] Does migration have both UP and DOWN?
- [ ] Can we rollback safely?
- [ ] Is there a query helper for common operations?
- [ ] Can this schema support 10x data volume?
- [ ] What happens if we need finer granularity later?

### Pattern: Design for Scale

```typescript
// ✅ This scales well
{
  resourceType: 'pull_requests',        // Filter dimension (10 values)
  organization: 'myorg',                // Filter dimension (1-100)
  repository: 'myrepo',                 // Filter dimension (1-1000)
  syncDate: '2025-01-15',               // Filter + time (365 values/year)
  
  synced_at: '2025-01-15T10:30:00Z',    // Debugging + ordering
  itemsSynced: 42                        // Aggregation
}

// Query patterns that work at scale:
// - Find all days for (resource, org, repo) → 365 rows max
// - Find all days in range → Binary search friendly with syncDate
// - Aggregate by resource/org → GROUP BY on small cardinality
// - Per-day analytics → scannable in chronological order
```

---

## Implementation Checklist

When applying these patterns to new metadata needs:

- [ ] Identify what history you need to track
- [ ] Design composite key including time dimension
- [ ] Add CHECK constraints for data validation
- [ ] Create supporting indexes for query predicates
- [ ] Implement UPSERT for idempotent operations
- [ ] Write comprehensive repository query helpers
- [ ] Create migration with UP and DOWN steps
- [ ] Add test coverage for edge cases
- [ ] Document reset/recovery procedures
- [ ] Plan for future granularity needs
