---
id: task-037
title: Add date range filter to check command
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 11:13'
updated_date: '2025-10-04 11:16'
labels:
  - enhancement
  - cli
dependencies: []
priority: medium
---

## Description

Add --since/--until flags to check command to show coverage analysis for specific date ranges. Categorize repos as COVERED (full coverage), PARTIAL (some coverage), or NO COVERAGE. Show actionable sync commands for missing data.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add --since and --until options to check command
- [x] #2 Parse dates and create requested date range
- [x] #3 Categorize repos: COVERED, PARTIAL, NO COVERAGE
- [x] #4 Show repos grouped by category with clear visual indicators
- [x] #5 Display missing date ranges for PARTIAL repos
- [x] #6 Generate actionable sync commands at the end
- [x] #7 Test with various date ranges
<!-- AC:END -->

## Implementation Notes

Added --since/--until options to check command. Parses dates same as sync (days ago or ISO). Categories repos: COVERED (full coverage), PARTIAL (some missing), NO COVERAGE. Shows top 10 covered, top 5 partial with missing ranges, count for no coverage. Generates actionable sync commands for repos needing data. Default view unchanged (no filter = show all). Perfect for checking 2025-01-01 coverage!
