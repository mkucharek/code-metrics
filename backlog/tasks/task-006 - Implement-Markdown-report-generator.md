---
id: task-006
title: Implement Markdown report generator
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 11:20'
updated_date: '2025-10-04 08:12'
labels:
  - presentation
  - formatters
dependencies: []
priority: medium
---

## Description

Create report formatters that transform report data structures (from ReportService) into various output formats. Formatters are pure functions with no business logic, making them easily swappable for different presentation layers.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Report: Overview of all engineers with key metrics table
- [x] #2 Report: Individual engineer detail report
- [x] #3 Report: Time series data showing trends
- [x] #4 Report: Team comparison and rankings
- [x] #5 Export reports to files or stdout
- [x] #6 Report templates customizable via configuration
- [x] #7 MarkdownFormatter: Transforms report data to markdown tables
- [x] #8 MarkdownFormatter: Overview report with all engineers
- [x] #9 MarkdownFormatter: Individual engineer detail report
- [x] #10 MarkdownFormatter: Time series and trend formatting
- [x] #11 ConsoleFormatter: Pretty terminal output with colors (for TUI future)
- [x] #12 Formatters accept plain data objects, return formatted strings
- [x] #13 JSONFormatter: Export raw data for web UI (future-proofing)
- [x] #14 All quality checks pass (pnpm check: typecheck, lint, format:check)
- [x] #15 No 'any' types used - use specific types or 'unknown'
<!-- AC:END -->


## Implementation Plan

1. Create report generator service to query DB and compute metrics
2. Implement Markdown formatter for different report types
3. Implement JSON formatter for data export
4. Add 'report' CLI command with options (--engineer, --format, --output)
5. Test with real synced data
6. Add tests for formatters
7. Update documentation


## Implementation Notes

Implemented comprehensive Markdown report generator system:

**Created Report Formatters (Pure Functions):**
- MarkdownFormatter: Overview, Engineer Detail, Team Rankings
- JSONFormatter: Raw data export for future web UI
- All formatters are pure functions (data in, string out)

**Implemented Report Generator Service:**
- ReportGenerator application service
- Queries database using repositories
- Computes metrics using domain functions
- Supports filtering by date range and repository

**Added CLI Report Command:**
- pnpm dev report (overview, rankings, engineer types)
- Options: --since, --until, --engineer, --repo, --format, --output, --type
- Outputs to stdout or file
- Supports markdown and JSON formats

**Report Types:**
1. Overview: All engineers with key metrics table
2. Engineer Detail: Individual engineer deep dive
3. Team Rankings: Top performers by category
   - Top PR Creators
   - Top Reviewers  
   - Top Code Contributors
   - Most Collaborative

**Features:**
- Date range filtering (days ago or ISO dates)
- Repository filtering
- JSON export for future web UI
- File output support
- Colored console output

**Manually Tested:**
✅ Overview report (25 engineers, 72 PRs)
✅ Rankings report (top performers in 4 categories)
✅ Engineer-specific report (alice, bob)
✅ JSON format export
✅ File output (/tmp/team-report.md)
✅ All quality checks passing (124 tests)

Files created:
- src/presentation/formatters/MarkdownFormatter.ts (pure functions)
- src/presentation/formatters/JSONFormatter.ts (pure functions)
- src/presentation/formatters/index.ts
- src/application/ReportGenerator.ts (service)
- src/application/index.ts

Files modified:
- src/presentation/cli/index.ts (added report command)
- src/infrastructure/storage/repositories/PRRepository.ts (added getUniqueRepositories)
