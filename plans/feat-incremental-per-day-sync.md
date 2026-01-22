# feat: Incremental Per-Day Sync

## Overview

Transform sync logic from continuous-range tracking to per-day granularity. Enables efficient incremental syncs where overlapping date ranges skip already-synced days, and data accumulates across multiple sync runs.

**Example use case:**
- Day 1: `sync --since 90` → fetches 90 days
- Day 2: `sync --since 90` → fetches only 1 new day, DB now has 91 days

## Problem Statement

Current sync tracks one continuous range per repository in `sync_metadata`. This creates issues:

1. **Rigid ranges** - Changing sync range requires re-syncing entire range
2. **No gap handling** - Can't efficiently fill gaps in synced data
3. **No accumulation** - Sync Jan 1-15, then Jan 10-20 re-fetches Jan 10-15

**Current architecture** (`src/infrastructure/github/GitHubSynchronizer.ts:226-263`):
- Three strategies: 'full', 'extension', 'skip'
- Extension only works when new endDate > cached endDate AND startDate matches
- No support for arbitrary gap-filling

## Proposed Solution

### Core Changes

1. **New `daily_sync_metadata` table** - Track sync status per (resource_type, org, repo, date)
2. **SyncPlanService** - Compute which days need syncing based on metadata
3. **Day-based GitHubSynchronizer** - Fetch data grouped by day, mark each day complete
4. **Ignore old `sync_metadata`** - Start fresh, no migration needed

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Day timezone | UTC | Consistent with GitHub API timestamps |
| PR-to-day mapping | `updated_at` | Matches GitHub's sort order, captures latest state |
| Data updates | Ignore once synced | Simple; `--force` for refresh |
| Migration | Start fresh | Simpler than backfill; clean slate |
| Storage | Same SQLite DB | Single source of truth |
| Data retention | Keep forever | No auto-pruning |

### Handling `updated_at` Changes

**Problem:** PR synced on Jan 15 (updated_at=Jan 15) gets a review on Jan 20. Now updated_at=Jan 20. If we sync Jan 20, we might miss it because we think Jan 15 is "done".

**Solution:** When syncing a day range, fetch ALL PRs updated within the range from GitHub API. For each PR:
1. Check if PR already exists in DB
2. If exists AND PR's current `updated_at` > stored `updated_at`, update the PR
3. Mark each day in range as synced

This means:
- Syncing Jan 20 fetches PRs updated on Jan 20 (including our PR now with reviews)
- We upsert the PR, capturing new reviews
- Jan 20 marked synced
- Jan 15 remains synced (we don't re-check it, but the PR data is updated anyway)

**Key insight:** Day tracking is about "did we check GitHub for updates on this day", not "does this PR belong to this day". A PR updated on multiple days gets captured when ANY of those days is synced.

## Technical Approach

### Database Schema

```sql
-- New table: src/infrastructure/storage/migrations/011_daily_sync_metadata.ts
CREATE TABLE daily_sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('pull_requests', 'reviews', 'comments', 'commits')),
  organization TEXT NOT NULL,
  repository TEXT NOT NULL,
  sync_date TEXT NOT NULL,  -- YYYY-MM-DD in UTC
  synced_at TEXT NOT NULL,  -- ISO timestamp when sync completed
  items_synced INTEGER NOT NULL DEFAULT 0,
  UNIQUE(resource_type, organization, repository, sync_date)
);

CREATE INDEX idx_daily_sync_lookup
  ON daily_sync_metadata(resource_type, organization, repository, sync_date);
```

### New Files

```
src/
├── application/services/
│   └── SyncPlanService.ts          # Compute days to sync
├── infrastructure/storage/
│   ├── migrations/
│   │   └── 011_daily_sync_metadata.ts
│   └── repositories/
│       └── DailySyncMetadataRepository.ts
└── domain/utils/
    └── dateRange.ts                # Date iteration utilities (add date-fns)
```

### Modified Files

| File | Changes |
|------|---------|
| `src/infrastructure/github/GitHubSynchronizer.ts` | Replace range-based logic with day-based |
| `src/application/services/SyncService.ts` | Integrate SyncPlanService |
| `src/presentation/cli/index.ts` | Update progress output for per-day sync |
| `package.json` | Add `date-fns` dependency |

### Implementation Flow

```
CLI: sync --since 90
       │
       ▼
SyncService.sync()
       │
       ▼
SyncPlanService.createPlan(startDate, endDate, force)
       │
       ├─► Query daily_sync_metadata for synced days
       │
       ├─► Compute missing days: allDays - syncedDays
       │
       └─► Return { daysToSync: [...], skipped: [...] }
       │
       ▼
For each repository:
       │
       ├─► GitHubSynchronizer.syncDays(repo, daysToSync)
       │       │
       │       ├─► Batch days into contiguous ranges for API efficiency
       │       │
       │       ├─► For each range: fetch PRs updated in range
       │       │
       │       ├─► Upsert PRs, reviews, comments, commits
       │       │
       │       └─► Mark each day in range as synced
       │
       └─► Display progress: "Day X of Y (repo A of B)"
```

### API Optimization

Instead of N API calls for N days, batch contiguous days:

```typescript
// Input: [Jan 1, Jan 2, Jan 3, Jan 5, Jan 6, Jan 10]
// Batches: [[Jan 1-3], [Jan 5-6], [Jan 10]]
// API calls: 3 instead of 6
```

## Acceptance Criteria

### Functional Requirements

- [ ] Syncing overlapping ranges skips already-synced days
- [ ] `--force` flag re-syncs all days in range regardless of metadata
- [ ] Data accumulates across syncs (sync Jan 1-3, then Jan 4-7 → reports work for Jan 1-7)
- [ ] Progress shows "Syncing day X of Y" and "Skipped N already-synced days"
- [ ] `check` command shows per-day coverage with gaps highlighted

### Non-Functional Requirements

- [ ] No performance regression for first-time full sync
- [ ] Contiguous days batched into single API calls
- [ ] All existing tests pass
- [ ] New tests for day-based sync logic

### Quality Gates

- [ ] `pnpm check` passes (typecheck, lint, format)
- [ ] `pnpm test` passes
- [ ] Manual verification with real GitHub data

## Implementation Phases

### Phase 1: Foundation

**Files:**
- `package.json` - add date-fns
- `src/domain/utils/dateRange.ts` - date iteration utilities
- `src/infrastructure/storage/migrations/011_daily_sync_metadata.ts`
- `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

**Deliverables:**
- New migration creates `daily_sync_metadata` table
- Repository with CRUD for daily sync records
- Date utilities for generating day ranges

### Phase 2: Sync Planning

**Files:**
- `src/application/services/SyncPlanService.ts`

**Deliverables:**
- Service that computes which days need syncing
- Handles `--force` flag (ignores metadata)
- Returns `{ daysToSync, skipped }` structure

### Phase 3: Synchronizer Refactor

**Files:**
- `src/infrastructure/github/GitHubSynchronizer.ts`

**Deliverables:**
- Replace continuous-range logic with day-based
- Batch contiguous days for API efficiency
- Mark each day complete after successful sync
- Handle partial failures (don't mark day complete if it fails)

### Phase 4: Integration & CLI

**Files:**
- `src/application/services/SyncService.ts`
- `src/presentation/cli/index.ts`

**Deliverables:**
- Wire SyncPlanService into SyncService
- Update CLI progress output
- Show "X days synced, Y skipped (already synced)"

### Phase 5: Check Command & Polish

**Files:**
- `src/presentation/cli/index.ts` (check command)
- Tests

**Deliverables:**
- Update `check` command to show per-day coverage
- Highlight gaps: "repo X: Jan 1-15, Jan 20-31 (missing: Jan 16-19)"
- Comprehensive tests for new logic

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Rate limit mid-day | Stop sync, don't mark day complete. Next run retries. |
| Network timeout | Same as rate limit - day not marked complete. |
| Partial repo failure | Mark successful days for successful repos. Failed days retry on next run. |
| Invalid date range | Validate upfront, error before any sync. |

## Testing Strategy

### Unit Tests

- `SyncPlanService` - missing day computation, force flag behavior
- `DailySyncMetadataRepository` - CRUD operations, queries
- `dateRange` utilities - day generation, batching

### Integration Tests

- End-to-end sync with mock GitHub API
- Verify incremental behavior (second sync skips days)
- Verify `--force` re-syncs all days

### Manual Testing

```bash
# First sync
pnpm dev sync --since 7

# Check coverage
pnpm dev check

# Second sync (should skip 7 days, sync 1 new)
pnpm dev sync --since 7

# Force resync
pnpm dev sync --since 7 --force

# Gap fill
pnpm dev sync --since 2024-01-01 --until 2024-01-15
pnpm dev sync --since 2024-01-10 --until 2024-01-20  # Should only sync Jan 16-20
```

## References

### Internal

- Current sync logic: `src/infrastructure/github/GitHubSynchronizer.ts:84-213`
- Sync metadata: `src/infrastructure/storage/repositories/SyncMetadataRepository.ts`
- Date utilities: `src/domain/utils/dates.ts`
- CLI sync command: `src/presentation/cli/index.ts:56-188`

### External

- [SQLite UPSERT](https://sqlite.org/lang_upsert.html) - ON CONFLICT DO UPDATE
- [date-fns eachDayOfInterval](https://date-fns.org/docs/eachDayOfInterval) - date iteration
- [GitHub API pagination](https://docs.github.com/en/rest/guides/using-pagination-in-the-rest-api)

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Timezone for day boundaries | UTC |
| PR-to-day mapping | `updated_at` (PR captured when any update-day synced) |
| Migration from old sync_metadata | Start fresh, ignore old table |
| Data retention | Keep forever, no auto-pruning |
