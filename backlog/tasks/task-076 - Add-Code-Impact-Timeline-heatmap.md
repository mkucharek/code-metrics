---
id: task-076
title: Add Code Impact Timeline heatmap
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-09 11:31'
updated_date: '2025-10-09 11:35'
labels:
  - enhancement
  - reporting
dependencies: []
---

## Description

Add a second heatmap to the engineer report showing total line changes (additions + deletions) from PRs and commits only. This complements the Activity Timeline by showing code volume patterns instead of just activity count.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add codeImpactHeatmap field to EngineerDetailReport interface
- [x] #2 Implement computeCodeImpactHeatmap method in ReportGenerator
- [x] #3 Update generateEngineerReport to compute code impact heatmap
- [x] #4 Add Code Impact Timeline section to MarkdownFormatter
- [x] #5 Update CSVFormatter to include code impact data
- [x] #6 Use appropriate thresholds: 0, 1-100, 101-500, 501-1000, 1000+
- [x] #7 Test with sample data to verify line change calculations
<!-- AC:END -->


## Implementation Plan

1. Add codeImpactHeatmap field to EngineerDetailReport interface
2. Implement computeCodeImpactHeatmap method in ReportGenerator (PRs + commits line changes)
3. Update generateEngineerReport to call computeCodeImpactHeatmap
4. Add "Code Impact Timeline" section to MarkdownFormatter after Activity Timeline
5. Update CSVFormatter to include code impact heatmap data
6. Test with pnpm dev report for alice to verify calculations
7. Run pnpm check to ensure quality


## Implementation Notes

Added Code Impact Timeline heatmap showing daily line changes from PRs + commits.

**Implementation:**
- Added codeImpactHeatmap: DailyContribution[] to EngineerDetailReport
- Implemented computeCodeImpactHeatmap() method in ReportGenerator
  - Aggregates line changes (additions + deletions) from merged PRs (by merge date)
  - Aggregates line changes from direct commits (non-merge, non-squash, by commit date)
  - Uses line-based thresholds: 0, 1-100, 101-500, 501-1k, 1k+
- Updated MarkdownFormatter to display new section after Activity Timeline
  - Same table structure as Activity Timeline
  - Different legend: ⬜ None  🟩 1-100  🟨 101-500  🟧 501-1k  🟥 1k+
  - Shows total lines and days with code activity
- Updated CSVFormatter to export code impact data

**Results:**
- Activity Timeline: Shows engagement (144 activities across 92 days)
- Code Impact Timeline: Shows throughput (10,336 lines across 18 days)
- Complements each other: busy days vs. high-impact days

**Example from alice Q3 2025:**
- Tue W36: 🟥 (11+ activities) vs. 🟥 (1k+ lines) = very busy + high impact
- Mon W32: 🟧 (6-10 activities) vs. ⬜ (0 lines) = busy with reviews, no code landed
- Thu W32: 🟩 (1-2 activities) vs. 🟥 (1k+ lines) = few actions but large PR merged

All 176 tests pass. All quality checks pass.
