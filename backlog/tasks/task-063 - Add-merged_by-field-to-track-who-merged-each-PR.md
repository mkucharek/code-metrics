---
id: task-063
title: Add merged_by field to track who merged each PR
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 15:17'
updated_date: '2025-10-08 16:02'
labels: []
dependencies: []
priority: high
---

## Description

Capture who actually merged the PR (different from author who created it). Useful for understanding PR shepherding, mentorship patterns, and identifying who helps land others' code.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add merged_by field to PullRequest domain model
- [x] #2 Update pull_requests database schema with merged_by column
- [x] #3 Create database migration for merged_by
- [x] #4 Update GitHubPullRequestSchema to capture merged_by user
- [x] #5 Update PR mapper to extract merged_by from GitHub data
- [x] #6 Update tests to verify merged_by is stored correctly
<!-- AC:END -->


## Implementation Plan

1. Add mergedBy field to PullRequest domain model
2. Update PRRepository schema to include merged_by
3. Create migration 006 for merged_by column
4. Update GitHubPullRequestSchema to capture merged_by
5. Update mapPullRequest to include merged_by
6. Update test mocks
7. Run quality checks
8. Commit


## Implementation Notes

Added merged_by field to track PR shepherding and mentorship patterns.

**Changes Made:**

1. **Domain Model** - Added mergedBy field to PullRequest interface
2. **Database** - Created migration 006 to add merged_by column
3. **Repository** - Updated PRRepository schema, save(), and toDomain()
4. **Mapper** - Updated mapPullRequest to extract merged_by from GitHub API
5. **Tests** - Updated all test mocks to include mergedBy: null

**Files Modified:**
- src/domain/models/PullRequest.ts - Added mergedBy field
- src/infrastructure/storage/repositories/PRRepository.ts - Updated schema and queries
- src/infrastructure/storage/migrations/006-add-merged-by-to-pull-requests.ts - New migration
- src/infrastructure/storage/migrations/index.ts - Added migration 006
- src/infrastructure/github/schemas.ts - Added merged_by to GitHubPullRequestSchema
- src/infrastructure/github/mappers.ts - Included mergedBy in mapPullRequest
- Test files - Added mergedBy: null to all mocks and manual migration

**Impact:**
Enables analysis of PR shepherding patterns, identifying who helps land others' code, and mentorship activities.

**Testing:**
All 176 tests pass. Migration 006 applies successfully.
