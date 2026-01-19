---
id: task-043
title: Add PR list section to engineer report
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 10:06'
updated_date: '2025-10-07 10:12'
labels:
  - enhancement
  - report
dependencies: []
priority: high
---

## Description

Add comprehensive PR list table at end of engineer report with details: week, repo, PR#, title (60 chars), status, lines added/deleted, reviews, comments, time to merge, changed files, commits.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add PR list data to EngineerDetailReport model
- [x] #2 Compute PR list with all metrics in generateEngineerDetailReport
- [x] #3 Implement time to merge calculation (mixed format: days for >1d, hours for <1d)
- [x] #4 Format PR list table in Markdown formatter
- [x] #5 Add PR list to JSON formatter
- [x] #6 Truncate PR titles to 60 characters with ellipsis
<!-- AC:END -->


## Implementation Plan

1. Add PR detail interface to EngineerDetailReport model
2. Implement time to merge calculation helper
3. Compute PR list with all metrics in generateEngineerDetailReport
4. Update Markdown formatter with new PR list section
5. Update JSON formatter to include PR list
6. Test with real data


## Implementation Notes

Added comprehensive PR list section to engineer reports.

Changes:
1. Added PRDetail interface with all metrics (week, repo, PR#, title, status, lines, reviews, comments, time to merge, files, commits)
2. Implemented computePRList() with:
   - ISO week number calculation
   - Time to merge calculation (mixed format: "2d", "5h", "N/A")
   - Title truncation (60 chars)
   - Review and comment counts per PR
3. Updated Markdown formatter with new "Pull Requests" section (12-column table)
4. JSON formatter automatically includes PR list in output
5. PRs sorted chronologically by creation date
6. Manually tested - shows all columns correctly

All 145 tests pass.
