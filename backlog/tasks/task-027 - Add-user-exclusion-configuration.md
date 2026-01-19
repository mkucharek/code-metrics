---
id: task-027
title: Add user exclusion configuration
status: Done
assignee: []
created_date: '2025-10-04 08:39'
updated_date: '2025-10-04 08:44'
labels:
  - enhancement
  - configuration
dependencies: []
priority: medium
---

## Description

Allow excluding specific users from reports via config file and CLI flag. Useful for excluding service accounts like your-bot.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add excludedUsers array to ReportsConfig schema
- [x] #2 Add --exclude-users CLI flag accepting comma-separated list
- [x] #3 Filter excluded users in ReportGenerator
- [x] #4 Update config documentation
- [x] #5 Test exclusion with real data
<!-- AC:END -->

## Implementation Notes

Added excludedUsers array to ReportsConfig schema. Added --exclude-users CLI flag accepting comma-separated list. Filters excluded users in ReportGenerator. Tested: --exclude-users 'user1,your-bot' reduced to 9 engineers.
