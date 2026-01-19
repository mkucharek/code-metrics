---
id: task-041
title: Add CLI command for engineer detail report
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-04 12:09'
updated_date: '2025-10-04 12:16'
labels:
  - enhancement
  - cli
dependencies: []
priority: high
---

## Description

Extend report CLI command to support single engineer reports with --engineer flag, generating detailed individual reports.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add --engineer flag to report command
- [x] #2 Route to engineer detail report when flag provided
- [x] #3 Support both Markdown and JSON formats
- [x] #4 Add validation for engineer parameter
- [x] #5 Update CLI help text and documentation
- [x] #6 Test manually with real data
<!-- AC:END -->


## Implementation Plan

1. Add --engineer flag to report command
2. Route to engineer detail report when flag provided
3. Add validation for engineer parameter
4. Update help text
5. Test manually with real data


## Implementation Notes

Integrated engineer detail report into CLI.

Changes:
1. Added --engineer flag support to report command (already existed, enhanced behavior)
2. Routes to generateEngineerDetailReport() when --engineer provided
3. Supports both Markdown and JSON formats (--format option)
4. Updated help text to clarify "detailed report"
5. Removed old simple engineer report, replaced with detailed version
6. Manually tested with real data:
   - Markdown format: Shows activity, reviews, collaboration, repos, weekly timeline
   - JSON format: Properly formatted JSON with all data

Command usage:
pnpm dev report --engineer <name> --since <date>
pnpm dev report --engineer <name> --since <date> --format json

All 145 tests pass.
