---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, code-quality, clarity]
dependencies: []
---

# Code Clarity: Magic Number 1.5 for Day Difference

## Problem Statement

The `batchIntoDayRanges()` function uses magic number `1.5` for day difference tolerance without clear justification. Since UTC dates are used throughout, timezone edge cases shouldn't exist.

**Why it matters:** Unclear code intent, possible bug masking.

## Findings

**Location:** `src/domain/utils/dateRange.ts` lines 72-76

```typescript
const msPerDay = 24 * 60 * 60 * 1000;
const dayDiff = (current.getTime() - prevDate.getTime()) / msPerDay;

if (dayDiff <= 1.5) { // "within ~36 hours to handle timezone edge cases"
```

**Questions:**
1. Why 1.5 and not 1.0 for consecutive days?
2. If using UTCDate throughout, what timezone edge cases exist?
3. Is this masking a bug in date parsing?

**Agent:** kieran-typescript-reviewer

## Proposed Solutions

### Option A: Change to Exact 1.0 (Recommended)
If UTC dates are consistently used, consecutive days should differ by exactly 1.

```typescript
const isConsecutive = dayDiff === 1;  // Exact check
// OR with small tolerance for floating point:
const isConsecutive = dayDiff > 0.99 && dayDiff < 1.01;
```

**Pros:** Precise, matches UTC semantics
**Cons:** May reveal bugs
**Effort:** Low
**Risk:** Medium - test thoroughly

### Option B: Document Rationale
Keep 1.5 but add comment explaining why.

**Pros:** No code changes
**Cons:** May be masking bug
**Effort:** Low
**Risk:** Low

### Option C: Extract as Named Constant
```typescript
const CONSECUTIVE_DAY_TOLERANCE = 1.5; // 36 hours to handle DST transitions
```

**Pros:** Self-documenting
**Cons:** Still unclear if correct
**Effort:** Low
**Risk:** Low

## Recommended Action

Option A - Investigate if 1.5 is actually needed, change to 1.0 if not

## Technical Details

**File to Modify:** `src/domain/utils/dateRange.ts`

## Acceptance Criteria

- [ ] Investigate why 1.5 is used
- [ ] Either document rationale or fix to 1.0
- [ ] Add test cases for edge scenarios
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Magic number needs justification |

## Resources

- PR: feat/incremental-per-day-sync
