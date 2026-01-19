---
id: task-068
title: Add file-level commit tracking for code ownership analysis
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 15:17'
updated_date: '2025-10-08 17:46'
labels: []
dependencies: []
priority: high
---

## Description

Store which files were changed in each commit. Enables expertise tracking (who works on what), code ownership analysis, and identifying knowledge silos. Creates new commit_files table to avoid bloating commits table.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create commit_files database table (commit_sha, filename, status, additions, deletions)
- [x] #2 Create database migration for commit_files table
- [x] #3 Update commit sync to store file changes from GitHub stats
- [x] #4 Add indexes for efficient file and author queries
- [x] #5 Update tests to verify file changes are stored correctly
<!-- AC:END -->


## Implementation Plan

1. Create CommitFile domain model
2. Create commit_files table schema
3. Create migration 009 for commit_files table
4. Create CommitFileRepository
5. Update GitHubSynchronizer to save commit files
6. Run checks and commit


## Implementation Notes

Added file-level commit tracking for code ownership and expertise analysis.

**Changes Made:**

1. **Domain Model** - Created CommitFile model with commitSha, repository, filename, status, additions, deletions
2. **Database** - Created commit_files table with FK to commits, indexed by SHA, filename, and repository
3. **Migration** - Created migration 009 for commit_files table with indexes
4. **Repository** - Created CommitFileRepository with save, saveBatch, findByCommit, findByFilename
5. **Sync** - Updated GitHubSynchronizer to save file changes from GitHub API
6. **Schema** - Enhanced GitHubCommitSchema files array with proper typing

**Files Created:**
- src/domain/models/CommitFile.ts - New domain model
- src/infrastructure/storage/schemas/commit-files.ts - Table and indexes
- src/infrastructure/storage/repositories/CommitFileRepository.ts - New repository
- src/infrastructure/storage/migrations/009-add-commit-files-table.ts - New migration

**Files Modified:**
- src/domain/models/index.ts - Export CommitFile
- src/infrastructure/storage/repositories/index.ts - Export CommitFileRepository
- src/infrastructure/storage/migrations/index.ts - Added migration 009
- src/infrastructure/github/schemas.ts - Proper typing for files array
- src/infrastructure/github/GitHubSynchronizer.ts - Save commit files in sync loop
- src/application/services/SyncService.ts - Pass CommitFileRepository to synchronizer
- src/infrastructure/github/GitHubSynchronizer.test.ts - Mock CommitFileRepository

**Impact:**
Enables code ownership analysis, expertise tracking, and knowledge silo identification.

**Testing:**
All 176 tests pass. Migration 009 applies successfully.
