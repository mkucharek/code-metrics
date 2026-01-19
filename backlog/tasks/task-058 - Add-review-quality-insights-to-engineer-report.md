---
id: task-058
title: Add review quality insights to engineer report
status: To Do
assignee: []
created_date: '2025-10-07 19:47'
labels:
  - enhancement
  - reporting
dependencies: []
priority: high
---

## Description

Enhance the Code Review Activity section of the engineer report to show review quality metrics, not just quantity. Currently shows only PRs reviewed and comments made, but doesn't show breakdown of review types (APPROVED vs CHANGES_REQUESTED vs COMMENTED) or approval rates. This helps identify if engineers are thorough reviewers vs rubber-stampers.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add review state breakdown (approved, changes requested, commented, dismissed) to EngineerDetailReport model
- [ ] #2 Compute approval rate percentage (approvals / total reviews)
- [ ] #3 Calculate detailed review count (reviews with >5 comments)
- [ ] #4 Add review quality metrics to MarkdownFormatter output
- [ ] #5 Update JSON and CSV formatters to include new metrics
- [ ] #6 Add tests for review quality computation
- [ ] #7 Update integration tests to verify new metrics appear in report
<!-- AC:END -->
