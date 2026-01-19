---
id: task-028
title: Add date range validation to report command
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 08:57'
updated_date: '2025-10-04 09:02'
labels:
  - enhancement
  - reports
dependencies: []
priority: high
---

## Description

Check if synced data exists for requested date range before generating report. Warn user if data is missing and suggest the sync command needed.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Query sync_metadata to check if data exists for date range
- [x] #2 Show warning if no data found for requested range
- [x] #3 Suggest exact sync command to run
- [x] #4 Allow user to continue anyway or abort
- [x] #5 Test with synced and un-synced date ranges
<!-- AC:END -->

## Implementation Notes

Added date range validation to report command. Checks sync_metadata for requested date range. Warns if no data found and suggests exact sync command. Prevents confusing empty reports. Tested with synced and un-synced date ranges.
