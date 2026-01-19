---
id: task-065
title: Store PR body/description for quality metrics
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 15:17'
updated_date: '2025-10-08 15:48'
labels: []
dependencies: []
priority: high
---

## Description

Store PR description text (body field). Already in GitHub schema but not being saved. Enables PR description quality analysis (length, completeness, template usage) and documentation metrics.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update PR mapper to store body field instead of discarding it
- [x] #2 Verify body field exists in database schema (should already be there)
- [x] #3 Update tests to verify body is stored correctly
<!-- AC:END -->


## Implementation Plan

1. Add body field to PullRequest domain model
2. Update PRRepository schema to include body
3. Create migration 005 for body column
4. Update GitHubPullRequestSchema to capture body
5. Update mapPullRequest to include body
6. Update test mocks to include body field
7. Run quality checks
8. Commit changes


## Implementation Notes

Implemented PR body/description storage for quality metrics.

**Changes Made:**

1. **Domain Model** - Added body field to PullRequest interface
2. **Database** - Created migration 005 to add body column to pull_requests table
3. **Repository** - Updated PRRepository schema, save(), and toDomain() methods
4. **Mapper** - Updated mapPullRequest to include body field (githubPR.body ?? '')
5. **Tests** - Updated all test mocks to include body field, added manual migration in test setup

**Files Modified:**
- src/domain/models/PullRequest.ts - Added body field
- src/infrastructure/storage/repositories/PRRepository.ts - Updated schema and queries
- src/infrastructure/storage/migrations/005-add-body-to-pull-requests.ts - New migration
- src/infrastructure/storage/migrations/index.ts - Added migration 005
- src/infrastructure/github/mappers.ts - Included body in mapPullRequest
- src/infrastructure/storage/repositories/PRRepository.test.ts - Added body to mocks and manual migration
- tests/integration/report-generation.test.ts - Added body to mocks and manual migration  
- src/domain/metrics/engineer-metrics.test.ts - Added body to mocks
- src/domain/metrics/organization-metrics.test.ts - Added body to mocks

**Impact:**
Enables future analysis of PR description quality, completeness, template usage, and documentation metrics.

**Testing:**
All 176 tests pass. Migration 005 applies successfully in production path (SyncService tests).
