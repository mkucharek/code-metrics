---
id: task-031
title: Show remaining API quota after each repository sync
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-04 10:13'
updated_date: '2025-10-04 10:13'
labels:
  - enhancement
  - github-api
dependencies: []
priority: high
---

## Description

Display remaining GitHub API quota after each repository completes syncing. This gives real-time visibility into quota consumption and helps predict if sync will complete.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Call checkRateLimit after each repo completes
- [x] #2 Display remaining/total quota in progress output
- [x] #3 Format output clearly (e.g., '💾 Quota: 3500/5000 remaining')
- [x] #4 Test with multi-repo sync
<!-- AC:END -->

## Implementation Notes

Added checkRateLimit call after each repository completes. Displays remaining/total quota and reset time in human-readable format. Output: '💾 Quota: 3500/5000 remaining (resets at 2:30 PM)'
