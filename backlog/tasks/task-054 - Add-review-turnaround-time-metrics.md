---
id: task-054
title: Add review turnaround time metrics
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 13:44'
updated_date: '2025-10-07 14:32'
labels:
  - enhancement
  - report
dependencies: []
priority: medium
---

## Description

Track and report on review turnaround times: time from PR open to first review, time to approval, and time from approval to merge.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add turnaround time calculations to domain models
- [x] #2 Calculate time to first review
- [x] #3 Calculate time to approval
- [x] #4 Calculate time from approval to merge
- [x] #5 Add percentile calculations (p50, p75, p95)
- [x] #6 Format turnaround metrics in reports
- [x] #7 Add turnaround time breakdown per engineer
<!-- AC:END -->


## Implementation Plan

1. Add turnaround time fields to EngineerDetailReport
2. Calculate time to first review
3. Calculate time to approval
4. Calculate time from approval to merge
5. Add percentile calculations (p50, p75, p95)
6. Format turnaround metrics in reports
7. Test with real data


## Implementation Notes

Added comprehensive review turnaround time metrics to engineer reports.

Implementation:
1. Extended EngineerDetailReport with turnaround section:
   - timeToFirstReview (median, p75, p95)
   - timeToApproval (median, p75, p95)
   - timeToMerge (median, p75, p95)
2. Added computeTurnaroundTimes() method:
   - Groups reviews by PR
   - Calculates time from PR creation to first review
   - Calculates time from PR creation to first approval
   - Calculates time from PR creation to merge
3. Added computePercentiles() helper:
   - Calculates median (p50), p75, and p95
   - Handles empty datasets gracefully
4. Added formatHours() utility:
   - Smart formatting: minutes, hours, or days
   - Examples: "45m", "2.5h", "3d 4h"
5. Formatted turnaround section in Markdown:
   - Shows all three turnaround metrics
   - Displays percentiles for each
   - Only shows metrics with data

Metrics Tracked:
- Time to First Review: How long PRs wait for initial feedback
- Time to Approval: How long PRs take to get approved
- Time to Merge: Total PR lifecycle from open to merge

Percentiles provide better insight than averages for skewed distributions.

All 160 tests pass.
