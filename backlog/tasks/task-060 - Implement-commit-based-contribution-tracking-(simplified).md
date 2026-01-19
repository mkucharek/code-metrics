---
id: task-060
title: Implement commit-based contribution tracking (simplified)
status: Done
assignee:
  - '@agent'
created_date: '2025-10-07 20:58'
updated_date: '2025-10-07 21:17'
labels:
  - enhancement
  - reporting
dependencies: []
priority: high
---

## Description

Add commit tracking to engineer reports to show code contributions similar to GitHub's contribution graph. Track commits to default branch only, with separate heatmap for code vs collaboration activity. Fetch default branch from GitHub API and cache for efficiency.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create Commit domain model with sha, author, committedAt, message, additions, deletions fields
- [x] #2 Add commits database table with indexes for author and date queries
- [x] #3 Create database migration 004 for commits table
- [x] #4 Add repository_metadata table to cache default branch per repo
- [x] #5 Create RepositoryMetadataRepository for cache management
- [x] #6 Add GitHubClient.fetchRepositoryInfo() to get default branch
- [x] #7 Add GitHubClient.fetchCommits() to fetch commits from specific branch
- [x] #8 Add CommitRepository with save() and findByAuthor() methods
- [x] #9 Update GitHubSynchronizer to sync commits with default branch caching
- [x] #10 Add commit metrics to EngineerDetailReport model
- [x] #11 Create separate code contributions heatmap (commits only)
- [x] #12 Update MarkdownFormatter to show commit stats and heatmaps
- [x] #13 Add unit and integration tests for commit tracking
<!-- AC:END -->


## Implementation Notes

Implemented commit-based contribution tracking with GitHub-style heatmaps.

Implementation complete in 3 phases:

Phase 1 - Foundation:
- Created Commit domain model (sha, author, committedAt, message, stats)
- Added commits and repository_metadata database tables with indexes
- Created migration 003 for new tables

Phase 2+3 - GitHub API and Repositories:
- Added default_branch field to GitHubRepositorySchema
- Implemented GitHubClient.fetchRepositoryInfo() to get repo metadata
- Implemented GitHubClient.fetchCommits(repo, branch, options) with branch filtering
- Created CommitRepository with save(), findByAuthor(), findByDateRange()
- Created RepositoryMetadataRepository for default branch caching (7-day TTL)

Phase 4 - Sync Logic:
- Updated GitHubSynchronizer to sync commits from default branch only
- Implemented getDefaultBranch() with intelligent caching (1 API call per week)
- Added syncCommits() method to fetch and store commits
- Updated SyncService to create and inject commit repositories
- Added commitsFetched to sync summary output

Phase 5 - Reporting:
- Added commits section to EngineerDetailReport (totalCommits, lines, avgCommitSize, avgCommitsPerDay)
- Created separate codeContributionHeatmap field for commits-only heatmap
- Updated ReportGenerator to fetch and compute commit metrics
- Implemented computeCodeContributionHeatmap() with commit-specific intensity scale (1-3/4-6/7-10/11+)
- Updated MarkdownFormatter with two separate heatmaps:
  * Code Contributions Heatmap (commits only)
  * Collaboration Activity Heatmap (PRs, reviews, comments)
- JSON formatter automatically includes new fields

Key features:
- Zero configuration (default branch fetched from GitHub API)
- Efficient caching (default branch cached for 7 days)
- Smart filtering (only commits to default branch count)
- Separate heatmaps prevent commits from dominating collaboration metrics
- Gracefully handles repos with no commits

All tests passing (176/176). All quality checks pass.
