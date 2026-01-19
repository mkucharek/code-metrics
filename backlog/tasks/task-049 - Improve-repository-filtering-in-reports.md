---
id: task-049
title: Improve repository filtering in reports
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 11:21'
updated_date: '2025-10-07 13:24'
labels:
  - enhancement
  - cli
dependencies: []
priority: low
---

## Description

Enhance --repo filter to support multiple repositories and provide clear filtering feedback in reports.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Support comma-separated repo list in --repo flag
- [x] #2 Show filtered repositories in report header
- [x] #3 Update help text with examples
- [x] #4 Validate repository names exist
<!-- AC:END -->


## Implementation Plan

1. Update CLI to accept comma-separated repo list in --repo flag
2. Add validation for repository names
3. Show filtered repositories in report header
4. Update help text with examples
5. Test with multiple repos


## Implementation Notes

Enhanced repository filtering in reports.

Implementation:
1. Updated ReportOptions interface to use repositories?: string[]
2. Modified filtering logic in ReportGenerator for all report types
3. CLI now accepts comma-separated repository names:
   --repo web-app
   --repo "web-app,api-app-data,aws-infra"
4. Added validation that checks repository names against available repos
5. Shows filtered repositories in report headers
6. Updated help text with examples

Validation:
- Invalid repo names rejected with helpful error message
- Lists all available repositories when validation fails
- Single and multiple repos work correctly
- Report headers clearly show filtered repositories

Examples:
pnpm dev report --repo web-app
pnpm dev report --repo "web-app,api-app-data"

All 145 tests pass.
