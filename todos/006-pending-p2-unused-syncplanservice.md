---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, simplicity, yagni]
dependencies: []
---

# Unused Code: SyncPlanService Not Used

## Problem Statement

`SyncPlanService` (205 lines) provides clean abstractions for creating sync plans, but `GitHubSynchronizer` duplicates this logic inline (lines 243-268). The service exists but isn't used, creating duplicate implementations.

**Why it matters:** Maintenance burden - two implementations of same logic that can drift out of sync.

## Findings

**Location:** `src/application/services/SyncPlanService.ts` - entire file unused

**Duplicate logic in GitHubSynchronizer.ts:**
```typescript
// Lines 243-250 - duplicates SyncPlanService.createRepoPlan logic
if (this.dailySyncMetadataRepository && !options.force) {
  const allDays = getDateRangeDays(options.startDate, options.endDate);
  const syncedDays = new Set(
    this.dailySyncMetadataRepository.getSyncedDays('pull_requests', org, repo, startKey, endKey)
  );
  daysToSync = allDays.filter((day) => !syncedDays.has(day));
  daysSkipped = allDays.filter((day) => syncedDays.has(day));
}
```

**Agent:** kieran-typescript-reviewer, code-simplicity-reviewer

## Proposed Solutions

### Option A: Delete SyncPlanService (Recommended)
Remove unused service, keep inline logic in GitHubSynchronizer.

**Pros:** -205 lines, simpler codebase
**Cons:** Lose abstraction if needed later
**Effort:** Low
**Risk:** None (code unused)

### Option B: Use SyncPlanService in GitHubSynchronizer
Inject SyncPlanService and delegate plan creation.

**Pros:** Single source of truth, cleaner separation
**Cons:** More dependencies, slight refactor
**Effort:** Medium
**Risk:** Low

### Option C: Keep Both, Document Intent
Keep SyncPlanService for future use (e.g., CLI dry-run).

**Pros:** No code changes
**Cons:** Dead code, confusion
**Effort:** None
**Risk:** Technical debt

## Recommended Action

Option A - Delete SyncPlanService (unless immediate use planned)

## Technical Details

**Files to Delete:**
- `src/application/services/SyncPlanService.ts`

**OR Files to Modify (Option B):**
- `src/infrastructure/github/GitHubSynchronizer.ts`
- `src/application/services/SyncService.ts`

## Acceptance Criteria

- [ ] Either SyncPlanService deleted OR used in GitHubSynchronizer
- [ ] No duplicate sync plan calculation logic
- [ ] Tests updated accordingly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | YAGNI violation - unused service |

## Resources

- PR: feat/incremental-per-day-sync
- Files: SyncPlanService.ts, GitHubSynchronizer.ts:243-268
