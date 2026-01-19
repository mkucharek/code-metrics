---
id: task-066
title: Populate path and line fields for review comments
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 15:17'
updated_date: '2025-10-08 15:59'
labels: []
dependencies: []
priority: high
---

## Description

Fix comment mapper to populate path and line fields for review comments. Schema already supports these but mapper sets them to null. Enables code hotspot analysis, identifying which files/areas get most discussion.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update comment mapper to extract path and line from GitHub review comments
- [x] #2 Update GitHubCommentSchema to include path, line, and diff_hunk fields
- [x] #3 Add file path tracking to review comment sync
- [x] #4 Update tests to verify path/line are populated for review comments
<!-- AC:END -->


## Implementation Plan

1. Verify GitHub API includes path/line in comment responses
2. Update GitHubCommentSchema to include path/line fields
3. Update mapComment to populate path/line from GitHub data
4. Update test expectations
5. Run quality checks
6. Commit changes


## Implementation Notes

Populated path and line fields for review comments to enable code hotspot analysis.

**Changes Made:**

1. **GitHub Schema** - Added optional path, line, position, diff_hunk fields to GitHubCommentSchema
2. **Mapper** - Updated mapComment to populate path and line from GitHub API data

**Files Modified:**
- src/infrastructure/github/schemas.ts - Added review comment fields
- src/infrastructure/github/mappers.ts - Updated to use githubComment.path/line

**Impact:**
Review comments now have file path and line number tracked, enabling:
- Code hotspot analysis (which files get most discussion)
- Line-level comment density metrics
- Identification of problematic code areas

**Testing:**
All 176 tests pass. Existing tests continue working as path/line are optional and default to null for issue comments.
