---
id: task-072
title: Remove Changes column from commits list
status: Done
assignee:
  - '@agent'
created_date: '2025-10-09 10:30'
updated_date: '2025-10-09 10:32'
labels: []
dependencies: []
---

## Description

The Changes column in the commits list shows +0/-0 for all commits because we use repos.listCommits API which doesn't include line change stats. Fetching full commit details would be too expensive (1 API call per commit). Remove the misleading column.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Remove additions and deletions fields from CommitDetail interface
- [x] #2 Remove Changes column from markdown commits table
- [x] #3 Remove Changes column from CSV commits output
- [x] #4 Update tests to match new format
<!-- AC:END -->


## Implementation Notes

Removed the misleading Changes column from commits list since repos.listCommits API doesn't include line stats. Changes: Removed additions/deletions/changedFiles from CommitDetail interface. Updated markdown formatter to remove Changes column. Updated CSV formatter to remove line change columns. All 176 tests pass.
