---
id: task-042
title: Add week numbers to engineer report timeline
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 10:06'
updated_date: '2025-10-07 10:09'
labels:
  - enhancement
  - report
dependencies: []
priority: high
---

## Description

Add ISO week number column (W01, W25 format) as first column in weekly activity table for easier timeline references.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add weekNumber field to WeeklyActivity model
- [x] #2 Compute ISO week number in computeWeeklyTimeline()
- [x] #3 Update formatEngineerDetailReport to include Week column
- [x] #4 Update formatEngineerDetailJSON to include week numbers
<!-- AC:END -->


## Implementation Plan

1. Add weekNumber field to WeeklyActivity interface
2. Create helper function to compute ISO week number
3. Update computeWeeklyTimeline to calculate and include week numbers
4. Update Markdown formatter to show Week column
5. Test with real data


## Implementation Notes

Added ISO week numbers to engineer report timeline.

Changes:
1. Added weekNumber field to WeeklyActivity model
2. Implemented getISOWeekNumber() helper using ISO 8601 standard
3. Updated computeWeeklyTimeline() to calculate and include week numbers
4. Updated Markdown formatter to display Week column as first column
5. Manually tested with real data - shows W16, W25, W35, etc.

All 145 tests pass.
