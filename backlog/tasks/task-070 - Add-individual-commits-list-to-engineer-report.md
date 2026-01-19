---
id: task-070
title: Add individual commits list to engineer report
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 18:49'
updated_date: '2025-10-08 18:55'
labels:
  - enhancement
  - reporting
dependencies: []
priority: high
---

## Description

Engineers need to see a detailed list of their individual commits (non-merge) in the report, similar to how PRs are listed. This provides visibility into daily code contributions and complements the PR-based view.

Currently the report shows aggregate commit statistics (totalCommits, avgCommitSize, etc.) but does not list individual commits with their messages, dates, and SHAs.

This feature will help engineers and managers understand daily contribution patterns and reference specific commits easily.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create CommitDetail interface in EngineerDetailReport.ts (date, sha, message, repository, additions, deletions)
- [x] #2 Add commitsList: CommitDetail[] field to EngineerDetailReport interface
- [x] #3 Update ReportGenerator to fetch non-merge commits for the engineer in date range
- [x] #4 Add commits list section in MarkdownFormatter after PRs section
- [x] #5 Include commitsList in JSON output (JSONFormatter)
- [x] #6 Include commitsList in CSV output (CSVFormatter)
- [x] #7 Update tests to verify commits list is populated and formatted correctly
<!-- AC:END -->


## Implementation Plan

1. Add CommitDetail interface to src/domain/models/EngineerDetailReport.ts
   - Include: date, sha (short), message, repository, additions, deletions, changedFiles
   - Similar structure to PRDetail but for commits

2. Update EngineerDetailReport interface
   - Add commitsList: CommitDetail[] field after prs field
   - Update type guard isEngineerDetailReport

3. Update src/application/ReportGenerator.ts
   - Import CommitRepository and isMergeCommit
   - In generateEngineerReport(), fetch commits for engineer in date range
   - Filter out merge commits using isMergeCommit()
   - Map to CommitDetail[] format
   - Sort by date (newest first)
   - Add to report object

4. Update src/presentation/formatters/MarkdownFormatter.ts
   - Add formatCommitsList() helper function
   - In formatEngineerDetailReport(), add commits section after PRs
   - Format: date | sha | message | +add/-del | repo
   - Add note about merge commits being excluded

5. Update src/presentation/formatters/JSONFormatter.ts
   - Ensure commitsList is included in JSON output (should work automatically)

6. Update src/presentation/formatters/CSVFormatter.ts
   - Add commits to CSV output (possibly as separate section or rows)

7. Update tests
   - Update mock EngineerDetailReport objects to include commitsList
   - Add test for commits list formatting in markdown
   - Verify commits are filtered correctly (no merge commits)


## Implementation Notes

Added individual commits list to engineer detail report.

**Changes Made:**

1. **Domain Model** - Added CommitDetail interface to EngineerDetailReport.ts
   - Fields: date, sha (7 chars), message, repository, additions, deletions, changedFiles

2. **Report Data** - Added commitsList field to EngineerDetailReport interface
   - Populated via new computeCommitsList() method in ReportGenerator
   - Filters out merge commits using isMergeCommit()
   - Sorted by date (newest first)

3. **Markdown Formatter** - Added commits section after PRs
   - Table format: Date | SHA | Message | Changes | Repository
   - Includes note about merge commit exclusion
   - Message truncated to 80 chars if needed

4. **CSV Formatter** - Added commits section after PRs
   - Separate table with all commit details
   - Empty line separator between sections

5. **JSON Formatter** - commitsList automatically included (no changes needed)

**Files Modified:**
- src/domain/models/EngineerDetailReport.ts - Added CommitDetail interface
- src/domain/models/index.ts - Export CommitDetail type
- src/application/ReportGenerator.ts - Added computeCommitsList() method
- src/presentation/formatters/MarkdownFormatter.ts - Added commits rendering
- src/presentation/formatters/CSVFormatter.ts - Added commits CSV output

**Testing:**
All 176 tests pass. Verified with real data for Khousheish Q3 2025 - shows 5 non-merge commits correctly.

**Impact:**
Engineers can now see detailed list of their individual commits (non-merge) alongside PR list, providing complete visibility into daily code contributions.
