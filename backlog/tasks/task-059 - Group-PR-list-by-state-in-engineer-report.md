---
id: task-059
title: Group PR list by state in engineer report
status: Done
assignee:
  - '@agent'
created_date: '2025-10-07 20:05'
updated_date: '2025-10-07 20:07'
labels:
  - enhancement
  - reporting
dependencies: []
priority: high
---

## Description

Divide the PR list section in engineer reports into three separate tables grouped by state (open, merged, closed). This makes it easy to see at a glance which PRs are still in-flight vs completed. Open PRs should show 'Age' instead of 'Time to Merge' and be sorted oldest-first to highlight stale work.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Group PRs into three arrays (open, merged, closed) in MarkdownFormatter
- [x] #2 Create separate table sections with headers and counts for each state
- [x] #3 Use 'Age' column for open PRs instead of 'Time to Merge'
- [x] #4 Add age calculation helper (time since creation for open PRs)
- [x] #5 Sort open PRs oldest-first, merged/closed newest-first
- [x] #6 Hide empty sections (only show states that have PRs)
- [x] #7 Add summary line if total PRs > 20
- [x] #8 Update integration tests to verify new sections appear
<!-- AC:END -->


## Implementation Notes

Implemented PR list grouping by state in engineer reports.

Changes made:
- Modified MarkdownFormatter.ts to group PRs into three sections: Open, Merged, Closed
- Added calculateAge() helper to show time since creation for open/closed PRs
- Added renderPRRow() helper to reduce code duplication
- Different columns per section: 'Age' for open PRs, 'Time to Merge' for merged, 'Time Open' for closed
- Sorting: Open PRs oldest-first (highlights stale work), merged/closed newest-first
- Empty sections are hidden automatically
- Summary line added when total PRs > 20
- Added integration test to verify grouped sections appear
- Removed 'Status' column since state is now in section headers

All tests pass (176 total). TypeScript strict mode, linting, and formatting checks all pass.
