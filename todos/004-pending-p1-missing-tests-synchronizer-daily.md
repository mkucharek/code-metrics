---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, testing, quality]
dependencies: []
---

# Missing Tests: GitHubSynchronizer Daily Sync Path

## Problem Statement

The existing `GitHubSynchronizer.test.ts` creates the synchronizer WITHOUT the `dailySyncMetadataRepository` parameter, meaning all tests exercise only the legacy code path. The new per-day tracking logic is completely untested.

**Why it matters:** The primary new feature (per-day sync) has no test coverage.

## Findings

**Location:** `src/infrastructure/github/GitHubSynchronizer.test.ts`

```typescript
// Lines 86-95 - missing 9th parameter
synchronizer = new GitHubSynchronizer(
  mockGitHubClient,
  mockPRRepository,
  mockReviewRepository,
  mockCommentRepository,
  mockSyncMetadataRepository,
  mockCommitRepository,
  mockCommitFileRepository,
  mockRepoMetadataRepository
  // Missing: dailySyncMetadataRepository
);
```

**Untested paths in GitHubSynchronizer.ts:**
- Lines 243-258: per-day sync skip logic
- Lines 466-477: dailySyncMetadata.saveBatch()
- Lines 287-291: batchIntoDayRanges usage

**Agent:** pr-test-analyzer, kieran-typescript-reviewer

## Proposed Solutions

### Option A: Add Mock and New Test Suite (Recommended)
Add `mockDailySyncMetadataRepository` to test setup and create new test cases.

```typescript
let mockDailySyncMetadataRepository: MockProxy<DailySyncMetadataRepository>;

beforeEach(() => {
  mockDailySyncMetadataRepository = mock<DailySyncMetadataRepository>();
  synchronizer = new GitHubSynchronizer(
    // ... existing mocks ...
    mockDailySyncMetadataRepository  // Add 9th parameter
  );
});

describe('per-day sync tracking', () => {
  it('should skip sync when all days already synced', async () => {
    mockDailySyncMetadataRepository.getSyncedDays.mockReturnValue([
      '2025-01-01', '2025-01-02', '2025-01-03'
    ]);
    // Sync should NOT call fetchPullRequests
  });

  it('should save daily sync records after successful sync', async () => {
    await synchronizer.sync({...});
    expect(mockDailySyncMetadataRepository.saveBatch).toHaveBeenCalled();
  });
});
```

**Pros:** Tests actual new feature
**Cons:** Requires updating all existing test setups
**Effort:** Medium (2 hours)
**Risk:** Low

## Recommended Action

Option A - Add mock and new test suite

## Technical Details

**Affected File:** `src/infrastructure/github/GitHubSynchronizer.test.ts`

**Test Cases Needed:**
1. Skip sync when all days already synced
2. Fetch only missing days, not synced days
3. saveBatch called after successful sync
4. saveBatch NOT called when no days to sync
5. Force flag bypasses daily sync check

## Acceptance Criteria

- [ ] mockDailySyncMetadataRepository added to test setup
- [ ] Per-day skip logic tested
- [ ] saveBatch call verification
- [ ] Force flag behavior tested
- [ ] Tests pass in CI

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Tests only cover legacy path |

## Resources

- PR: feat/incremental-per-day-sync
- File: GitHubSynchronizer.test.ts
