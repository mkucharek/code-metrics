---
id: task-061
title: Use committer date instead of author date for commits
status: Done
assignee:
  - '@agent'
created_date: '2025-10-08 12:24'
updated_date: '2025-10-08 12:26'
labels:
  - bug
  - reporting
dependencies: []
priority: high
---

## Description

Currently using commit.author.date which shows when commits were originally made on feature branches. For squash-merge workflows, this causes commits to appear on old dates instead of when PRs were actually merged. Should use commit.committer.date instead, which shows when code actually landed on the default branch.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Update GitHubSynchronizer to use committer.date instead of author.date
- [x] #2 Verify commit dates now align with PR merge dates
- [x] #3 Update any related tests
- [x] #4 Re-sync data to fix historical commit dates
<!-- AC:END -->


## Implementation Notes

Fixed commit date to use committer date instead of author date. This is critical for squash-merge workflows where the author date is preserved from feature branch commits.

Changes made:
- Updated GitHubCommitSchema to include committer field (name, email, date)
- Changed GitHubSynchronizer.syncCommits() to use commit.committer.date
- Added detailed comment explaining why this matters for squash-merge

Impact:
- Commits now appear on the date they were merged (committer date)
- Not on the date they were originally written (author date)
- Heatmap aligns with PR merge dates
- Accurate representation of when code landed

Testing:
- All existing tests pass (176/176)
- TypeScript strict mode passes
- Code quality checks pass

Next step for user:
Re-sync data with --force to fix historical commits:
pnpm dev sync --repo web-app --since 2025-07-01 --until 2025-09-30 --force
