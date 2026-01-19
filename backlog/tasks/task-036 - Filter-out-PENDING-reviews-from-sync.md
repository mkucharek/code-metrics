---
id: task-036
title: Filter out PENDING reviews from sync
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 11:10'
updated_date: '2025-10-04 11:15'
labels:
  - bug
  - github-api
  - validation
dependencies: []
priority: high
---

## Description

GitHub returns PENDING reviews that haven't been submitted yet (submitted_at is undefined). These are drafts and should not be included in metrics. Filter them out during sync to avoid Zod errors and inaccurate metrics.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update GitHubReviewSchema: submitted_at to z.string().nullish()
- [x] #2 Filter out reviews with state === 'PENDING' in GitHubSynchronizer
- [x] #3 Add comment explaining why PENDING reviews are excluded
- [x] #4 Test with PR that has pending reviews
- [x] #5 Verify metrics don't include draft reviews
<!-- AC:END -->

## Implementation Notes

Fixed PENDING reviews Zod error. Updated GitHubReviewSchema: submitted_at to z.string().nullish(). Added filter in GitHubSynchronizer to exclude reviews with state === 'PENDING'. PENDING reviews are drafts not yet submitted - no submitted_at date, shouldn't be in metrics. No more Zod crashes!
