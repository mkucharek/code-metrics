---
id: task-035
title: Fix quota estimation for cached and extension scenarios
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 11:03'
updated_date: '2025-10-04 11:15'
labels:
  - bug
  - github-api
  - caching
dependencies: []
priority: high
---

## Description

Move quota check to happen AFTER cache detection. For cache hits, skip entirely. For extensions, use fixed estimate without calling countPullRequests(). Only call countPullRequests() for full syncs to save API quota and avoid false skips.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Move quota check logic after cache hit detection
- [x] #2 Cache hit: skip immediately without quota check
- [x] #3 Extension: use fixed estimate (e.g., 15 PRs per day extended) without countPullRequests()
- [x] #4 Full sync: call countPullRequests() for accurate estimate
- [x] #5 Save API calls by not counting PRs when unnecessary
- [x] #6 More accurate estimates for extensions (not based on total repo PRs)
- [x] #7 Test: extension with low quota should not skip unnecessarily
<!-- AC:END -->

## Implementation Notes

Fixed quota estimation logic. Cache hits: skip immediately (no quota check). Extensions: use fixed estimate (15 PRs/day) WITHOUT calling countPullRequests(). Full syncs: call countPullRequests() for accurate count. Saves API quota, more accurate estimates, won't skip unnecessarily. Extensions now estimate ~15 PRs instead of 840!
