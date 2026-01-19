---
id: task-025
title: Fix PR merged state detection
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 08:39'
updated_date: '2025-10-04 08:44'
labels:
  - bug
  - metrics
dependencies: []
priority: high
---

## Description

GitHub API returns state='closed' for merged PRs, not 'merged'. Fix mapper to set state='merged' when merged_at is not null. This will fix the 'PRs Merged: 0' issue.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update mapPullRequest to set state='merged' when merged_at !== null
- [x] #2 Update existing tests to verify merged state detection
- [x] #3 Verify with real data that merged PRs now show correctly
<!-- AC:END -->

## Implementation Notes

Fixed mapper to properly set state='merged' when merged_at is not null. GitHub API returns state='closed' for merged PRs, so we need to explicitly check merged_at field. Tested with real data - now showing correct merge rate (35.7% instead of 0%).
