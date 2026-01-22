---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, architecture, refactoring]
dependencies: []
---

# Refactoring: syncSingleRepository is Too Long (265 lines)

## Problem Statement

`GitHubSynchronizer.syncSingleRepository()` is ~265 lines with 10+ responsibilities. This makes it hard to test, understand, and maintain.

**Why it matters:** God method anti-pattern reduces maintainability.

## Findings

**Location:** `src/infrastructure/github/GitHubSynchronizer.ts` lines 227-492

**Responsibilities identified:**
1. Day-to-sync calculation (lines 239-264)
2. Legacy cache checking (lines 266-284)
3. Quota estimation (lines 296-317)
4. PR fetching and filtering (lines 319-362)
5. PR detail fetching (lines 364-380)
6. Review fetching (lines 382-406)
7. Comment fetching (lines 408-439)
8. Commit fetching (lines 441-452)
9. Metadata updates (lines 454-486)
10. Progress reporting (throughout)

**Agent:** kieran-typescript-reviewer, pattern-recognition-specialist

## Proposed Solutions

### Option A: Extract Helper Methods (Recommended)
Break into focused private methods:

```typescript
private calculateDaysToSync(options, org, repo): { daysToSync: string[], daysSkipped: string[] }
private checkLegacyCache(options, org, repo): boolean
private estimateQuota(repoCount, options): { prs, details }
private processPullRequests(prs, org, repo): SyncStats
private updateSyncMetadata(org, repo, daysToSync, summary): void
```

**Pros:** Each method testable, single responsibility
**Cons:** More methods to navigate
**Effort:** Medium
**Risk:** Low

### Option B: Extract to Separate Classes
Create dedicated synchronizer classes per resource type.

**Pros:** Clean separation, reusable
**Cons:** Over-engineering for current needs
**Effort:** High
**Risk:** Medium

### Option C: Keep as Is
Document the flow with comments.

**Pros:** No code changes
**Cons:** Remains hard to test/maintain
**Effort:** None
**Risk:** Technical debt

## Recommended Action

Option A - Extract helper methods

## Technical Details

**File to Modify:** `src/infrastructure/github/GitHubSynchronizer.ts`

## Acceptance Criteria

- [ ] syncSingleRepository reduced to <100 lines
- [ ] Helper methods have single responsibilities
- [ ] Each helper method is testable
- [ ] Existing tests still pass
- [ ] No behavior changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | God method - 265 lines |

## Resources

- PR: feat/incremental-per-day-sync
