---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, testing, quality]
dependencies: []
---

# Missing Tests: SyncPlanService

## Problem Statement

`SyncPlanService` (205 lines) has zero test coverage. This service determines which days need syncing - bugs cause either unnecessary API calls (cost/rate limit) or missed data (incorrect metrics).

**Why it matters:** Incorrect sync plan calculation leads to either wasted API quota or permanent data gaps.

## Findings

**Location:** `src/application/services/SyncPlanService.ts`

**Untested critical paths:**
- `createPlan()` - multi-repo plan calculation
- `createRepoPlan()` with `force=true` - should return ALL days
- `createRepoPlan()` without force - should return only missing days
- Summary aggregation correctness

**Agent:** pr-test-analyzer

## Proposed Solutions

### Option A: Full Unit Test Suite (Recommended)
Create test file with mocked DailySyncMetadataRepository.

```typescript
// SyncPlanService.test.ts
describe('SyncPlanService', () => {
  let mockRepo: MockProxy<DailySyncMetadataRepository>;
  let service: SyncPlanService;

  beforeEach(() => {
    mockRepo = mock<DailySyncMetadataRepository>();
    service = new SyncPlanService(mockRepo);
  });

  describe('createPlan', () => {
    it('should return all days when force=true', () => {
      mockRepo.getSyncedDays.mockReturnValue(['2025-01-01']);
      const plan = service.createPlan({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-05'),
        repositories: ['web-app'],
        organization: 'test',
        force: true,
      });
      expect(plan.repoPlans['web-app'].daysToSync).toHaveLength(5);
    });
  });
});
```

**Pros:** Isolated tests, fast execution
**Cons:** Requires mock setup
**Effort:** Medium (1-2 hours)
**Risk:** None

## Recommended Action

Option A - Full unit test suite with mocks

## Technical Details

**New File:** `src/application/services/SyncPlanService.test.ts`

**Test Cases Needed:**
1. `createPlan()` with force=true returns all days
2. `createPlan()` without force returns only missing days
3. `createPlan()` with multiple repos aggregates correctly
4. `createRepoPlan()` handles empty synced days
5. `needsSync()` returns true when days missing
6. `getMissingDays()` returns correct subset
7. Summary totals are accurate

## Acceptance Criteria

- [ ] Test file created with mocked repository
- [ ] Force flag behavior verified
- [ ] Multi-repo aggregation tested
- [ ] Empty/edge cases covered
- [ ] Tests pass in CI

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Critical gap - no tests |

## Resources

- PR: feat/incremental-per-day-sync
- Similar pattern: SyncService.test.ts
