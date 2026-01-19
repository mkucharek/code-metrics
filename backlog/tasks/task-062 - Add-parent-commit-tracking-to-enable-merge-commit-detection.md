---
id: task-062
title: Add parent commit tracking to enable merge commit detection
status: Done
assignee:
  - '@assistant'
created_date: '2025-10-08 15:15'
updated_date: '2025-10-08 15:22'
labels: []
dependencies: []
priority: high
---

## Description

Add parents field to commits table to distinguish merge commits (2+ parents) from regular commits (1 parent). This is critical for accurate code contribution metrics as merge commits inflate contribution counts without representing actual code work.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add parent_count field to commits domain model
- [x] #2 Update commits database schema with parent_count column
- [x] #3 Create database migration 004 for parent_count
- [x] #4 Update GitHubCommitSchema to capture parents array
- [x] #5 Update commit mapper to calculate parent_count from parents array
- [x] #6 Update GitHubSynchronizer to store parent_count
- [x] #7 Add isMergeCommit() utility that checks parent_count >= 2
- [x] #8 Update tests to verify parent_count is stored correctly
<!-- AC:END -->


## Implementation Plan

1. Add parentCount field to Commit domain model
2. Add isMergeCommit() utility function
3. Update CommitRepository schema and queries
4. Create migration 004 for parent_count column
5. Update GitHubCommitSchema to capture parents array
6. Create mapCommit() function in mappers.ts
7. Update GitHubSynchronizer to use mapper
8. Fix all tests that use Commit model
9. Run type checks, linting, and tests
10. Commit changes


## Implementation Notes

Implemented parent commit tracking to enable accurate merge commit detection.

**Changes Made:**

1. **Domain Model** - Added parentCount field to Commit interface and isMergeCommit() utility
2. **Database Schema** - Added parent_count column via migration 004
3. **GitHub API** - Updated GitHubCommitSchema to capture parents array
4. **Mapper** - Created mapCommit() function that calculates parentCount from parents.length
5. **Sync** - Updated GitHubSynchronizer to use mapCommit() instead of manual commit creation

**Files Modified:**
- src/domain/models/Commit.ts - Added parentCount field and isMergeCommit()
- src/infrastructure/storage/repositories/CommitRepository.ts - Updated schema and queries
- src/infrastructure/storage/migrations/004-add-parent-count-to-commits.ts - New migration
- src/infrastructure/storage/migrations/index.ts - Added migration 004
- src/infrastructure/github/schemas.ts - Added parents array to schema
- src/infrastructure/github/mappers.ts - Added mapCommit() function
- src/infrastructure/github/GitHubSynchronizer.ts - Use mapCommit()

**Impact:**
Enables accurate detection of merge commits (parentCount >= 2) for filtering from code contribution metrics.

**Testing:**
All 176 tests pass. Migration 004 applies automatically in test environments.
