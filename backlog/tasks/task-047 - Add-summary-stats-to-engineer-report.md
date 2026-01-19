---
id: task-047
title: Add summary stats to engineer report
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 11:21'
updated_date: '2025-10-07 11:25'
labels:
  - enhancement
  - report
dependencies: []
priority: medium
---

## Description

Add a concise summary section at the top of engineer reports showing key metrics at a glance: avg PRs/week, most productive day, busiest week, consistency score.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add summary stats section after header
- [x] #2 Calculate avg PRs per week
- [x] #3 Identify most productive day of week
- [x] #4 Identify busiest week
- [x] #5 Add consistency metric (std deviation or similar)
- [x] #6 Format cleanly above Activity Overview
<!-- AC:END -->


## Implementation Plan

1. Add summary stats computation to ReportGenerator
2. Calculate: avg PRs/week, most productive day, busiest week
3. Add consistency score calculation
4. Format summary section in Markdown formatter
5. Place after header, before Activity Overview
6. Test with real data


## Implementation Notes

Added summary stats section at top of engineer reports.

Added:
1. SummaryStats interface with key metrics
2. computeSummaryStats() method calculating:
   - Avg PRs per week (total PRs / weeks in range)
   - Most productive day (day with most contributions)
   - Busiest week (week with most activity)
   - Active days count (days with contributions)
3. Summary section formatted above Activity Overview

Example output:
- Avg PRs/Week: 2.2
- Most Productive Day: Thursday
- Busiest Week: W38
- Active Days: 9 of 35 days

Provides quick at-a-glance metrics before diving into details.

All 145 tests pass.
