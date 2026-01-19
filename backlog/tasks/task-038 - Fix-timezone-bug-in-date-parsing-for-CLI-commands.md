---
id: task-038
title: Fix timezone bug in date parsing for CLI commands
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-04 11:27'
updated_date: '2025-10-04 11:32'
labels:
  - bug
  - cli
dependencies: []
priority: high
---

## Description

Date parsing using 'new Date(YYYY-MM-DD)' parses as UTC, causing off-by-one day errors in non-UTC timezones. Need consistent local date parsing across sync/report/check commands.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create date parsing utility function in src/domain/utils/dates.ts
- [x] #2 Add comprehensive unit tests for date parsing (multiple timezones)
- [x] #3 Update sync command to use new date parser
- [x] #4 Update report command to use new date parser
- [x] #5 Update check command to use new date parser
- [x] #6 Verify all commands handle ISO dates consistently
<!-- AC:END -->


## Implementation Plan

1. Create date parsing utility in src/domain/utils/dates.ts
2. Write comprehensive unit tests (cover multiple timezones, edge cases)
3. Update sync command date parsing
4. Update report command date parsing
5. Update check command date parsing
6. Run all tests to verify consistency


## Implementation Notes

Fixed timezone bug in CLI date parsing that caused off-by-one day errors in non-UTC timezones.

Changes:
1. Created date parsing utility (src/domain/utils/dates.ts) with timezone-safe functions:
   - parseLocalDate() - Parse ISO date as local midnight
   - parseLocalDateEndOfDay() - Parse ISO date as local 23:59:59.999
   - getDaysAgo() - Get date N days ago at start of day
   - getEndOfToday() - Get current date at end of day
   - formatLocalDate() - Format date as YYYY-MM-DD

2. Added comprehensive unit tests (21 tests) covering:
   - Date parsing edge cases (leap years, invalid dates)
   - Timezone consistency across UTC, America/New_York, Europe/Warsaw, Asia/Tokyo
   - Round-trip parsing and formatting
   - Input validation

3. Updated all CLI commands to use new date utilities:
   - sync command: Replaced manual date parsing
   - report command: Replaced manual date parsing
   - check command: Replaced manual date parsing + fixed comparison logic

4. Fixed coverage comparison logic:
   - Changed from timestamp comparison to ISO date string comparison
   - Prevents timezone-related false positives in coverage detection

Root cause: Using new Date(YYYY-MM-DD) parses as UTC, causing day shifts in non-UTC timezones (e.g., UTC+2 shifted 2025-01-01 to 2024-12-31).

All 145 tests pass, including 21 new timezone tests.
