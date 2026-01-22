---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, data-integrity, architecture]
dependencies: []
---

# Data Integrity: Non-Atomic Sync Operations

## Problem Statement

The `syncSingleRepository()` method marks ALL requested days as synced regardless of whether their data was actually processed. If sync fails mid-way (rate limit, OOM, network error), days are marked as synced when their PRs were never fetched.

**Why it matters:** Data corruption risk - days marked as "synced" when no data was actually fetched, causing permanent data gaps.

## Findings

**Location:** `src/infrastructure/github/GitHubSynchronizer.ts` lines 466-477

```typescript
if (this.dailySyncMetadataRepository) {
  const dailyRecords = daysToSync.map((syncDate) => ({
    resourceType: 'pull_requests' as const,
    // ...
  }));
  this.dailySyncMetadataRepository.saveBatch(dailyRecords);  // Marks ALL days
}
```

**Scenario:**
1. User syncs days Jan 1-10
2. PRs for days 1-5 processed successfully
3. Rate limit hit at day 6, error caught, loop breaks
4. `saveBatch()` called with ALL 10 days
5. Days 6-10 marked as "synced" but their PRs were never fetched

**Agent:** data-integrity-guardian

## Proposed Solutions

### Option A: Track Actually-Processed Days (Recommended)
Track which days had data processed and only mark those as synced.

```typescript
const daysWithData = new Set<string>();
for (const githubPR of dedupedPRs) {
  const prDateKey = formatDateKey(new Date(githubPR.created_at));
  daysWithData.add(prDateKey);
  // ... process PR ...
}

// Only mark days that were actually processed
const processedDays = daysToSync.filter(d => daysWithData.has(d));
this.dailySyncMetadataRepository.saveBatch(processedDays.map(...));
```

**Pros:** Accurate tracking, no false positives
**Cons:** Slightly more complex logic
**Effort:** Medium
**Risk:** Low

### Option B: Save Incrementally Per-Day
Save sync metadata after each day's data is fully processed.

**Pros:** More granular, fail-safe
**Cons:** More DB writes, transaction overhead
**Effort:** Medium
**Risk:** Low

### Option C: Wrap Entire Sync in Transaction
Use a single transaction for all sync operations per repository.

**Pros:** All-or-nothing atomicity
**Cons:** Large transactions may cause lock contention; SQLite limitations
**Effort:** High
**Risk:** Medium

## Recommended Action

Option A - Track actually-processed days

## Technical Details

**Affected Files:**
- `src/infrastructure/github/GitHubSynchronizer.ts`

**Components:** GitHubSynchronizer.syncSingleRepository()

## Acceptance Criteria

- [ ] Only days with actually-processed data are marked as synced
- [ ] If sync fails mid-way, only successfully processed days are recorded
- [ ] Existing sync behavior maintained for successful syncs
- [ ] Tests verify partial sync failure handling

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Critical data integrity issue |

## Resources

- PR: feat/incremental-per-day-sync
- Lines: GitHubSynchronizer.ts:466-477
