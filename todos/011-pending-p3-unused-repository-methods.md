---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, simplicity, yagni]
dependencies: []
---

# Unused Code: DailySyncMetadataRepository Methods

## Problem Statement

Several methods in `DailySyncMetadataRepository` are not called anywhere in the codebase. ~150 lines of unused code.

**Why it matters:** Dead code increases maintenance burden and cognitive load.

## Findings

**Location:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

Unused methods:
- `getAllSyncedDays()` (lines 136-156) - 21 lines
- `isDaySynced()` (lines 161-180) - 20 lines
- `getDay()` (lines 184-207) - 24 lines
- `getSyncSummary()` (lines 259-298) - 40 lines
- `getDateRangeCoverage()` (lines 304-340) - 37 lines

**Total:** ~142 lines of unused code

**Agent:** code-simplicity-reviewer

## Proposed Solutions

### Option A: Delete Unused Methods (Recommended)
Remove methods that aren't called.

**Pros:** -142 lines, cleaner codebase
**Cons:** May need to re-add if features needed later
**Effort:** Low
**Risk:** Low (can restore from git)

### Option B: Keep for Future Use
Document intended use cases.

**Pros:** No code changes
**Cons:** YAGNI violation, dead code
**Effort:** None
**Risk:** Technical debt

## Recommended Action

Option A - Delete unused methods

## Technical Details

**File to Modify:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

**Methods to Delete:**
- `getAllSyncedDays`
- `isDaySynced`
- `getDay`
- `getSyncSummary`
- `getDateRangeCoverage`

**Note:** `getSyncSummary` is used by `SyncService.getRepositoriesWithDailySync()`. If that method is also unused, both can be removed.

## Acceptance Criteria

- [ ] Unused methods removed
- [ ] No compile errors
- [ ] Tests pass
- [ ] LOC reduced by ~140

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | YAGNI - unused methods |

## Resources

- PR: feat/incremental-per-day-sync
