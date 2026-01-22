---
status: pending
priority: p3
issue_id: "012"
tags: [code-review, simplicity, yagni]
dependencies: []
---

# Unused Code: dateRange.ts Functions

## Problem Statement

Several functions in `dateRange.ts` are not called anywhere. ~40 lines of unused code.

**Why it matters:** Dead code increases maintenance burden.

## Findings

**Location:** `src/domain/utils/dateRange.ts`

Unused functions:
- `computeMissingDays()` (lines 96-103) - 8 lines
- `formatDateRange()` (lines 108-112) - 5 lines (only used by formatDaysWithGaps)
- `formatDaysWithGaps()` (lines 121-147) - 27 lines

**Total:** ~40 lines of unused code

**Note:** `formatDaysWithGaps` is used by `SyncService.getDailySyncCoverage()` which may itself be unused.

**Agent:** code-simplicity-reviewer

## Proposed Solutions

### Option A: Delete Unused Functions (Recommended)
Remove functions that aren't called.

**Pros:** -40 lines, cleaner codebase
**Cons:** May need to re-add if features needed later
**Effort:** Low
**Risk:** Low

### Option B: Keep for Utility Library
Keep as general-purpose utilities.

**Pros:** Available for future use
**Cons:** YAGNI, extra tests to maintain
**Effort:** None
**Risk:** Technical debt

## Recommended Action

Option A - Delete unused functions (verify usage first)

## Technical Details

**File to Modify:** `src/domain/utils/dateRange.ts`

**Functions to Delete (if confirmed unused):**
- `computeMissingDays`
- `formatDateRange`
- `formatDaysWithGaps`

**Also update:** `src/domain/utils/dateRange.test.ts` - remove tests for deleted functions

## Acceptance Criteria

- [ ] Verify functions are truly unused
- [ ] Delete unused functions
- [ ] Update tests
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | YAGNI - unused functions |

## Resources

- PR: feat/incremental-per-day-sync
