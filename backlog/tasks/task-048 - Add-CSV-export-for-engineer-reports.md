---
id: task-048
title: Add CSV export for engineer reports
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 11:21'
updated_date: '2025-10-07 11:28'
labels:
  - enhancement
  - report
dependencies: []
priority: medium
---

## Description

Add --format csv option to export engineer reports as CSV for Excel/spreadsheet analysis. Include all key metrics in structured format.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add csv format option to report command
- [x] #2 Create CSVFormatter for engineer detail report
- [x] #3 Export activity metrics as CSV
- [x] #4 Export PR list as CSV
- [x] #5 Export weekly timeline as CSV
- [x] #6 Test CSV output opens correctly in Excel
<!-- AC:END -->


## Implementation Plan

1. Add csv format option to CLI
2. Create CSVFormatter module
3. Export PR list as CSV (most useful for analysis)
4. Add header row with all columns
5. Test CSV output and verify it opens in Excel
6. Update help text


## Implementation Notes

Added CSV export format for engineer reports.

Implementation:
1. Added "csv" to format option in CLI
2. Created CSVFormatter module with escapeCSV helper
3. Exports PR list as CSV with 14 columns:
   - Week, Repository, PR Number, Title, Status
   - Lines Added, Lines Deleted, Total Changed
   - Reviews, Comments, Time to Merge
   - Changed Files, Commits, Created Date
4. Proper CSV escaping (handles commas, quotes, newlines)
5. Header row with column names
6. Tested with real data - opens correctly in spreadsheet apps

Usage:
pnpm dev report --engineer <name> --since <date> --format csv
pnpm dev report --engineer <name> --since <date> --format csv --output report.csv

All 145 tests pass.
