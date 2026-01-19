---
id: task-033
title: Skip large repositories when quota is insufficient
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 10:13'
updated_date: '2025-10-04 10:15'
labels:
  - enhancement
  - github-api
dependencies: []
priority: medium
---

## Description

Before syncing a repository, estimate API calls needed. If quota is insufficient, skip it and try next repo. This maximizes repos synced per quota cycle.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Estimate API calls per PR (use fixed 5 calls/PR)
- [x] #2 Count PRs for repository before syncing
- [x] #3 Check if quota.remaining >= estimated calls + safety margin
- [x] #4 Skip repo if insufficient quota
- [x] #5 Log skip reason with PR count and estimate
- [x] #6 Continue to next repo instead of stopping
- [x] #7 Test with low quota scenario
<!-- AC:END -->

## Implementation Notes

Added countPullRequests method to GitHubClient. Before syncing each repo, checks quota and estimates API calls needed (5 calls/PR + safety margin). Skips repo if insufficient quota (with clear message). Shows estimate for repos that will be synced. This maximizes repos synced per quota cycle!
