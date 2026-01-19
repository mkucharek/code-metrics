---
id: task-056
title: Add repository health metrics
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 13:44'
updated_date: '2025-10-07 14:38'
labels:
  - enhancement
  - report
dependencies: []
priority: low
---

## Description

Track repository-level health indicators including merge rate, average review time, and activity levels.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add repository health data structure
- [x] #2 Calculate merge rate by repository
- [x] #3 Calculate average review time by repo
- [x] #4 Identify most/least active repositories
- [x] #5 Add repository health report type
- [x] #6 Format repository rankings in reports
<!-- AC:END -->


## Implementation Plan

1. Add repository health model
2. Calculate merge rate by repository
3. Calculate average review time by repo
4. Identify most/least active repositories
5. Add repository health report type
6. Format repository rankings


## Implementation Notes

Added comprehensive repository health metrics and reporting.

Implementation:
1. Created RepositoryHealth model:
   - RepositoryHealthMetrics (per-repo stats)
   - RepositoryHealthReport (aggregated report)
2. Added generateRepositoryHealthReport() to ReportGenerator:
   - Calculate merge rate by repository
   - Calculate average review time
   - Count active engineers per repo
   - Track PR sizes and activity
3. Created formatRepositoryHealthReport():
   - Most active repositories (top 5)
   - Best merge rates (top 5)
   - Slowest review times (top 5)
   - Complete repository table
4. Added --type repos to CLI
5. Integrated with existing filtering

Metrics Tracked per Repository:
- PR count and merge rate
- Average review time
- Active engineers
- Lines added/deleted
- Average PR size

Usage:
pnpm dev report --type repos --since 30
pnpm dev report --type repos --repo "web-app,api-app-data"

Helps identify:
- Most/least active repositories
- Repositories with high/low merge rates
- Review bottlenecks
- Team coverage

All 160 tests pass.
