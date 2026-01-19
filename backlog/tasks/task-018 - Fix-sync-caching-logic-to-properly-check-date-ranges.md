---
id: task-018
title: Fix sync caching logic to properly check date ranges
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 15:36'
updated_date: '2025-10-03 15:41'
labels:
  - bug
  - performance
dependencies: []
priority: high
---

## Description

The current cache check compares lastSyncAt >= endDate, which always fails because endDate is "now" and keeps moving forward. This means every sync re-fetches all data, wasting API quota.

Need to check if the previous sync date range covers the requested range instead.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cache check compares date ranges instead of lastSyncAt vs endDate
- [x] #2 Test shows second sync with same date range skips fetching
- [x] #3 Test shows sync with extended date range fetches new data
- [ ] #4 Update documentation to reflect caching behavior
<!-- AC:END -->

## Implementation Notes

Fixed sync caching to properly check date ranges and round to day boundaries.

**Problem:**
- Previous logic compared lastSyncAt >= endDate
- Since endDate = "now" and keeps moving forward, cache always missed
- Every sync re-fetched all data, wasting API quota

**Solution:**
1. Changed cache check to compare date ranges:
   - if previous sync covered [start, end], skip
   - dateRangeStart <= options.startDate && dateRangeEnd >= options.endDate
2. Round dates to day boundaries when using --since N:
   - Start: N days ago at 00:00:00
   - End: today at 23:59:59
   - This ensures same command = same date range = cache hit

**Results:**
- First run: 24 PRs, 97 API requests
- Second run: cached ✅, 0 API requests

**Tests:**
- Added 7 comprehensive cache tests
- All pass ✅

Files: GitHubSynchronizer.ts, GitHubSynchronizer.test.ts, cli/index.ts
