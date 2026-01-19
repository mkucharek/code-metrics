---
id: task-046
title: Add GitHub links to PR numbers in report
status: Done
assignee:
  - '@agent-k'
created_date: '2025-10-07 10:37'
updated_date: '2025-10-07 10:38'
labels:
  - enhancement
  - report
dependencies: []
priority: high
---

## Description

Make PR numbers in the PR list table clickable by converting them to Markdown links pointing to actual GitHub PRs. Format: [#842](https://github.com/org/repo/pull/842)

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add organization field to EngineerDetailReport model
- [x] #2 Update ReportGenerator to include organization
- [x] #3 Format PR numbers as Markdown links in formatter
- [x] #4 Generate proper GitHub PR URLs
- [x] #5 Test with real data to verify links work
<!-- AC:END -->


## Implementation Plan

1. Add organization field to EngineerDetailReport model
2. Update ReportGenerator to include organization in report
3. Update Markdown formatter to create GitHub PR links
4. Test with real data


## Implementation Notes

Made PR numbers clickable by converting them to GitHub links.

Changes:
1. Added organization field to EngineerDetailReport model
2. Updated ReportGenerator to include organization from options
3. Updated Markdown formatter to generate GitHub PR links
4. Format: [#842](https://github.com/org/repo/pull/842)
5. Tested with real data - links render correctly

Example:
- Before: | aws-infra | 123 | Add permissions | merged |
- After: | aws-infra | [#123](https://github.com/org/aws-infra/pull/123) | Add permissions | merged |

The links work in Obsidian, Notion, GitHub, and any Markdown renderer.

All 145 tests pass.
