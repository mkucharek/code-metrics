---
id: task-026
title: Add bot user filtering to reports
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 08:39'
updated_date: '2025-10-04 08:44'
labels:
  - enhancement
  - reports
dependencies: []
priority: medium
---

## Description

Add --include-bots flag to show bot users in reports (hidden by default). Automatically detect bot users by [bot] suffix or Copilot username.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add isBot helper function to detect bot users
- [x] #2 Add --include-bots CLI flag (bots hidden by default)
- [x] #3 Filter bot users in ReportGenerator before computing metrics
- [x] #4 Update report tests to verify bot filtering
- [x] #5 Test with real data that bots are hidden by default
<!-- AC:END -->

## Implementation Notes

Added bot user filtering with --include-bots flag (bots hidden by default). Created isBot helper function to detect [bot] suffix and 'Copilot' username. Filters bots in ReportGenerator before computing metrics. Tested: default (11 engineers), --include-bots (15 engineers).
