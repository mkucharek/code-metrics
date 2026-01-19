---
id: task-064
title: Add head and base branch names to PRs
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 15:17'
updated_date: '2025-10-08 16:48'
labels: []
dependencies: []
priority: high
---

## Description

Store source branch (head) and target branch (base) names for each PR. Enables analysis of branching strategies (feature/, hotfix/, release/), cross-branch collaboration patterns, and feature branch lifespans.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add headRef and baseRef fields to PullRequest domain model
- [x] #2 Update pull_requests database schema with head_ref and base_ref columns
- [x] #3 Create database migration for branch fields
- [x] #4 Update GitHubPullRequestSchema to capture head.ref and base.ref
- [x] #5 Update PR mapper to extract branch names from GitHub data
- [x] #6 Update tests to verify branch names are stored correctly
<!-- AC:END -->


## Implementation Plan

1. Add headBranch and baseBranch fields to PullRequest domain model
2. Update PRRepository schema
3. Create migration 007 for branch columns
4. Update GitHubPullRequestSchema
5. Update mapPullRequest
6. Update test mocks
7. Run checks and commit


## Implementation Notes

Added head and base branch names to enable branching strategy analysis.

**Changes Made:**

1. **Domain Model** - Added headBranch and baseBranch fields to PullRequest
2. **Database** - Created migration 007 for branch columns  
3. **Repository** - Updated PRRepository schema, save(), and toDomain()
4. **Mapper** - Updated mapPullRequest to extract branch names from GitHub API
5. **Tests** - Updated all test mocks to include branch fields

**Files Modified:**
- src/domain/models/PullRequest.ts - Added headBranch/baseBranch fields
- src/infrastructure/storage/repositories/PRRepository.ts - Updated schema and queries
- src/infrastructure/storage/migrations/007-add-branch-names-to-pull-requests.ts - New migration
- src/infrastructure/storage/migrations/index.ts - Added migration 007
- src/infrastructure/github/schemas.ts - Added head.ref and base.ref
- src/infrastructure/github/mappers.ts - Extract branch names
- Test files - Added branch fields to all mocks and manual migration

**Impact:**
Enables analysis of branching strategies (feature/, hotfix/), cross-branch collaboration, and feature branch lifespans.

**Testing:**
All 176 tests pass. Migration 007 applies successfully.
