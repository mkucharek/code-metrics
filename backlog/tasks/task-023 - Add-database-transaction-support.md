---
id: task-023
title: Add database transaction support
status: To Do
assignee: []
created_date: '2025-10-03 18:42'
labels:
  - quality
  - data-integrity
dependencies: []
priority: medium
---

## Description

Currently saves PR, reviews, and comments separately with no atomicity. If a review save fails, we have orphaned PRs.

Add transaction support:
- withTransaction helper
- Wrap PR + reviews + comments in single transaction
- Add saveBatch methods for efficiency
- All-or-nothing guarantees

Ensures data consistency and accurate sync counts.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create withTransaction utility function
- [ ] #2 Add saveBatch method to PRRepository
- [ ] #3 Add saveBatch method to ReviewRepository
- [ ] #4 Add saveBatch method to CommentRepository
- [ ] #5 Wrap PR sync in transaction in GitHubSynchronizer
- [ ] #6 Update sync to use batch methods
- [ ] #7 Add tests for transaction rollback scenarios
- [ ] #8 Verify no partial data on failures
<!-- AC:END -->
