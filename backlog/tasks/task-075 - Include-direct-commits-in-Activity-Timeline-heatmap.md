---
id: task-075
title: Include direct commits in Activity Timeline heatmap
status: Done
assignee:
  - '@agent'
created_date: '2025-10-09 11:14'
updated_date: '2025-10-09 11:15'
labels: []
dependencies: []
priority: high
---

## Description

Currently the Activity Timeline heatmap only shows PRs, reviews, and comments. Add direct commits (non-merge, non-squash) to the heatmap to show complete daily activity picture including code contributions via direct commits.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update computeContributionHeatmap to include commits parameter
- [x] #2 Add commit dates to daily contribution counts
- [x] #3 Update heatmap legend and description to mention commits
- [x] #4 Update note to clarify what's included in timeline
- [x] #5 Test heatmap includes commit activity
<!-- AC:END -->


## Implementation Notes

Updated Activity Timeline heatmap to include direct commits alongside PRs, reviews, and comments for complete daily activity picture. Changes: Added commits parameter to computeContributionHeatmap(). Filter and count direct commits (non-merge, non-squash) by committed date. Updated heatmap comment to mention all activity types. Updated legend description to include commits. Result: Heatmap now shows complete picture of all engineering activities. All 176 tests pass.
