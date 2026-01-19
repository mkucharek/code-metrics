---
id: task-029
title: Add 'check' command to show synced data
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 08:57'
updated_date: '2025-10-04 09:02'
labels:
  - enhancement
  - cli
dependencies: []
priority: medium
---

## Description

Add CLI command to display what data ranges are currently synced for each repository. Helps users understand what's available before generating reports.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add 'check' CLI command
- [x] #2 Query sync_metadata table for all repositories
- [x] #3 Display sync date ranges and item counts
- [x] #4 Show last sync time for each repository
- [x] #5 Add helpful tips about syncing more data
<!-- AC:END -->

## Implementation Notes

Added 'check' CLI command to display synced data ranges. Queries sync_metadata table, shows date ranges per repository, item counts, and time since last sync. Helpful for seeing what data is available before generating reports.
