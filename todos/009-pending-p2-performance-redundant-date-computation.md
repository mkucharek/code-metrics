---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, performance, optimization]
dependencies: []
---

# Performance: Redundant Date Range Computation

## Problem Statement

`getDateRangeDays()` is called separately for each repository in the sync loop, creating redundant Date object allocations. For 100 repos with 1000-day range: 100,000+ unnecessary Date objects.

**Why it matters:** Memory pressure and GC overhead at scale.

## Findings

**Location:** `src/infrastructure/github/GitHubSynchronizer.ts` lines 243-244

```typescript
// Called inside syncSingleRepository for EACH repo
const allDays = getDateRangeDays(options.startDate, options.endDate);
```

Also in `SyncPlanService.ts` lines 152-153:
```typescript
// Two iterations when one would suffice
const daysToSync = allDays.filter((day) => !syncedDays.has(day));
const alreadySynced = allDays.filter((day) => syncedDays.has(day));
```

**Agent:** performance-oracle

## Proposed Solutions

### Option A: Pre-compute Once, Pass Through (Recommended)

Compute `allDays` once in `sync()` method and pass to `syncSingleRepository()`:

```typescript
async sync(options: SyncOptions): Promise<SyncSummary> {
  const allDays = getDateRangeDays(options.startDate, options.endDate);

  for (const repo of repositories) {
    await this.syncSingleRepository(org, repo, options, allDays);
  }
}
```

**Pros:** Eliminates redundant computation
**Cons:** Signature change
**Effort:** Low-Medium
**Risk:** Low

### Option B: Single-Pass Partition

Replace two filter calls with single partition:
```typescript
const daysToSync: string[] = [];
const alreadySynced: string[] = [];
for (const day of allDays) {
  (syncedDays.has(day) ? alreadySynced : daysToSync).push(day);
}
```

**Pros:** 50% reduction in iterations
**Cons:** Minor readability impact
**Effort:** Low
**Risk:** None

## Recommended Action

Both Option A and B

## Technical Details

**Files to Modify:**
- `src/infrastructure/github/GitHubSynchronizer.ts`
- `src/application/services/SyncPlanService.ts`

**Impact at Scale:**
- 100 repos, 3 years (1095 days): 109,500 → 1,095 Date objects

## Acceptance Criteria

- [ ] allDays computed once per sync, not per repo
- [ ] Single-pass partition replaces double filter
- [ ] Tests pass
- [ ] Memory usage reduced (verify with profiler if desired)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Redundant computation pattern |

## Resources

- PR: feat/incremental-per-day-sync
- Complexity: O(R * n) → O(n) where R = repos, n = days
