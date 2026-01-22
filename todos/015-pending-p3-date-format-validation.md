---
status: pending
priority: p3
issue_id: "015"
tags: [code-review, validation, security]
dependencies: []
---

# Validation: No Date Format Validation in parseDateKey

## Problem Statement

`parseDateKey()` accepts any string and passes it to `parseISO()`. Invalid date strings return Invalid Date rather than throwing, which could cause subtle bugs.

**Why it matters:** Invalid dates silently propagate, causing hard-to-debug issues.

## Findings

**Location:** `src/domain/utils/dateRange.ts` lines 19-21

```typescript
export function parseDateKey(dateKey: string): Date {
  return startOfDay(new UTCDate(parseISO(dateKey)));
}
```

**Also:** Database `sync_date` column has no CHECK constraint for format.

**Risk:** Low - data comes from internal sources, but defensive coding is better.

**Agent:** security-sentinel

## Proposed Solutions

### Option A: Add Regex Validation (Recommended)

```typescript
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateKey(dateKey: string): Date {
  if (!DATE_KEY_REGEX.test(dateKey)) {
    throw new ValidationError(`Invalid date format: ${dateKey}`, ['dateKey']);
  }
  return startOfDay(new UTCDate(parseISO(dateKey)));
}
```

**Pros:** Fails fast on invalid input
**Cons:** Slight overhead
**Effort:** Low
**Risk:** None

### Option B: Add Database CHECK Constraint

```sql
CHECK(sync_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
```

**Pros:** Database-level enforcement
**Cons:** Requires migration
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option A - Add regex validation in function

## Technical Details

**File to Modify:** `src/domain/utils/dateRange.ts`

## Acceptance Criteria

- [ ] parseDateKey throws on invalid format
- [ ] Add test for invalid input
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Missing input validation |

## Resources

- PR: feat/incremental-per-day-sync
