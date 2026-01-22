---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, testing, quality]
dependencies: []
---

# Missing Tests: DailySyncMetadataRepository

## Problem Statement

`DailySyncMetadataRepository` (341 lines) has zero test coverage. This is the persistence layer for the entire incremental sync feature - data could be silently corrupted or lost without tests.

**Why it matters:** Repository handles critical upsert logic, date range queries, and batch transactions. Bugs here cause data loss or infinite re-syncing.

## Findings

**Location:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

**Untested critical paths:**
- `save()` - upsert behavior (ON CONFLICT DO UPDATE)
- `saveBatch()` - transaction rollback on partial failure
- `getSyncedDays()` - date range boundary conditions (off-by-one)
- `deleteRange()` - force resync correctness

**Agent:** pr-test-analyzer

## Proposed Solutions

### Option A: Full Unit Test Suite (Recommended)
Create comprehensive test file with in-memory SQLite database.

```typescript
// DailySyncMetadataRepository.test.ts
describe('DailySyncMetadataRepository', () => {
  let db: Database.Database;
  let repo: DailySyncMetadataRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db, ALL_MIGRATIONS);
    repo = new DailySyncMetadataRepository(db);
  });

  describe('save', () => {
    it('should insert new record', () => {...});
    it('should update existing record (upsert)', () => {...});
  });

  describe('getSyncedDays', () => {
    it('should include boundary dates', () => {...});
    it('should return empty array when no matches', () => {...});
  });
});
```

**Pros:** Comprehensive coverage, catches edge cases
**Cons:** Time investment
**Effort:** Medium (2-3 hours)
**Risk:** None

### Option B: Integration Tests Only
Test via SyncService integration tests.

**Pros:** Less test code
**Cons:** Harder to isolate failures, slower
**Effort:** Low
**Risk:** Medium - may miss edge cases

## Recommended Action

Option A - Full unit test suite

## Technical Details

**New File:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.test.ts`

**Test Cases Needed:**
1. `save()` insert new record
2. `save()` upsert updates itemsSynced
3. `saveBatch()` commits all or none
4. `getSyncedDays()` boundary dates included
5. `getSyncedDays()` returns [] for empty results
6. `deleteRange()` removes correct records
7. `isDaySynced()` returns correct boolean
8. `getDateRangeCoverage()` handles empty table

## Acceptance Criteria

- [ ] Test file created with in-memory SQLite
- [ ] All public methods have at least one test
- [ ] Boundary conditions tested (date ranges)
- [ ] Transaction rollback behavior verified
- [ ] Tests pass in CI

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Critical gap - no tests |

## Resources

- PR: feat/incremental-per-day-sync
- Similar pattern: PRRepository.test.ts
