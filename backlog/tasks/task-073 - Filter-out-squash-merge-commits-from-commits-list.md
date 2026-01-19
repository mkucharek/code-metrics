---
id: task-073
title: Filter out squash-merge commits from commits list
status: Done
assignee:
  - '@agent'
created_date: '2025-10-09 10:30'
updated_date: '2025-10-09 10:42'
labels: []
dependencies: []
---

## Description

Commits that are squash-merges of PRs appear in the commits list but shouldn't be counted as individual contributions since they're already represented in the PR metrics. GitHub appends PR number in format: 'Title (#NUMBER)'. Filter these out to show only genuine direct commits.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add isSquashMergeCommit utility function to check for (#NUMBER) pattern
- [x] #2 Filter out squash-merge commits in computeCommitsList
- [x] #3 Update commit list note to mention squash-merge exclusion
- [x] #4 Update tests for squash-merge filtering
<!-- AC:END -->


## Implementation Notes

Filtered out squash-merge commits from commits list to avoid double-counting contributions already represented in PR metrics. GitHub appends PR number in format: 'Title (#NUMBER)'. Changes: Added isSquashMergeCommit utility function to check for (#NUMBER) pattern. Updated computeCommitsList to filter out squash-merge commits. Updated markdown section title to 'Commits (Non-Merge, Non-Squash)'. Result: alice Q3 2025 went from 36 commits (19 were squash-merges) to 17 genuine direct commits. All 176 tests pass.
