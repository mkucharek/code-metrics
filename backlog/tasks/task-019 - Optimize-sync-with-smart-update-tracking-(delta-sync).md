---
id: task-019
title: Optimize sync with smart update tracking (delta sync)
status: To Do
assignee: []
created_date: '2025-10-03 18:23'
updated_date: '2025-10-03 18:24'
labels:
  - optimization
  - performance
  - nice-to-have
dependencies: []
priority: low
---

## Description

Currently, extending the date range (e.g., --since 3 to --since 4) re-fetches all data, wasting API quota.

Smart update tracking would:
1. Fetch PR list (cheap: 1 request per 100 PRs)
2. Check DB for existing PRs
3. Compare updated_at timestamps
4. Fetch details ONLY for new/updated PRs

This would save 50-95% of API requests for range extensions and re-syncs.

Example savings:
- --since 3 to --since 4: 97 requests → 5 requests (95% savings)
- Re-run same range to check updates: 97 → 5-10 requests
- --since 30 to --since 60: 1000 → 500 requests (50%)

Current behavior is reasonable for manual CLI usage. Only implement if:
- Users report hitting rate limits
- Org grows to 500+ repos
- Need automated/continuous sync

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Add updated_at field to PullRequest model and DB schema
- [ ] #2 Add updated_at to Review and Comment models (for completeness)
- [ ] #3 Update migration to add updated_at columns with default values
- [ ] #4 Modify sync logic to fetch PR list first and compare with DB
- [ ] #5 Only fetch full PR details for new or updated PRs
- [ ] #6 Track which PRs were skipped vs fetched in summary
- [ ] #7 Add tests for delta sync scenarios
- [ ] #8 Update documentation to explain delta sync behavior
- [ ] #9 Measure and log API request savings
<!-- AC:END -->


## Implementation Plan

1. Database Schema Changes:
   - Add updated_at DATETIME to pull_requests table
   - Add updated_at DATETIME to reviews table
   - Add updated_at DATETIME to comments table
   - Create migration 002-add-updated-at-fields.ts
   - Backfill existing rows with created_at or current time

2. Domain Model Updates:
   - Add updatedAt: Date to PullRequest interface
   - Add updatedAt: Date to Review interface
   - Add updatedAt: Date to Comment interface
   - Update type guards

3. Repository Layer:
   - Update DBPullRequestSchema with updated_at
   - Add findByIdWithUpdatedAt() method
   - Update save() to handle updated_at

4. GitHub API Mapping:
   - Map updated_at from GitHub response to domain model
   - Handle null/undefined cases

5. Synchronizer Logic:
   a. Fetch PR list (existing logic)
   b. For each PR in list:
      - Check if exists in DB: prRepo.findById(pr.id)
      - If not exists: fetch full details (new PR)
      - If exists: compare pr.updated_at vs db.updatedAt
        - If newer: fetch full details (updated PR)
        - If same: skip (already have latest)
   c. Update summary to track:
      - prsNew: count
      - prsUpdated: count  
      - prsSkipped: count

6. Testing:
   - Test new PR (not in DB)
   - Test updated PR (newer updated_at)
   - Test unchanged PR (same updated_at)
   - Test mixed scenario
   - Verify API request counts

7. Documentation:
   - Update CLI guide with delta sync explanation
   - Update GitHub API guide with optimization details
   - Add examples of savings

## Implementation Notes

Created as a "nice to have" optimization for future implementation.

## Current State Analysis

The current caching (task-018) handles the main use case:
- Running same command twice: CACHED ✅ (0 requests)
- Cache works for subsets: CACHED ✅
- API quota: 5000/hour (sufficient for normal use)

But extending date ranges re-fetches everything:
- --since 3 → --since 4: Re-fetches all 4 days (75% wasted)
- Manual sync workflow: Not a major issue

## Expected Savings

### Scenario 1: Extend date range by 1 day
- Current: 97 requests (re-fetch all)
- With delta: 5 requests (1 list + 1 new PR)
- Savings: 92 requests (95%)

### Scenario 2: Re-sync same range (check for updates)
- Current: 97 requests (re-fetch all)
- With delta: 5-10 requests (only updated PRs)
- Savings: 87-92 requests (90-95%)

### Scenario 3: Extend 30 → 60 days
- Current: 1000 requests
- With delta: 500 requests
- Savings: 500 requests (50%)

## Implementation Effort

Estimated: 2-3 hours
- Schema changes: 30 min
- Logic updates: 1 hour
- Testing: 30 min
- Documentation: 30 min

## When to Implement

Implement when:
1. Users report hitting rate limits frequently
2. Org grows to 500+ repos (normal sync uses 4000+ requests)
3. Want automated/continuous sync (cron jobs)
4. Need to sync very large date ranges regularly

Don't implement if:
- Current usage stays under 1000 requests/sync
- Manual, occasional syncs only
- Small to medium org (< 100 repos)

## Technical Notes

### Key Insight
GitHub's updated_at reflects:
- PR updates (title, description, state)
- New reviews added
- New comments added

By comparing updated_at, we know if ANY aspect of the PR changed.

### Safe Approach
1. Always fetch PR list (cheap)
2. Check each PR against DB
3. Only fetch details for new/updated
4. Conservative: if no updated_at in DB, fetch details

### Risks (Low)
- GitHub API updated_at could be unreliable → Test thoroughly
- Clock skew issues → Use >= comparison, not ==
- Migration complexity → Use sensible defaults

## Alternative Considered

Delta fetch (fetch only date gap): REJECTED
- Risk: Would miss PRs created earlier but updated in gap
- Example: PR from Aug 1 + review on Sept 29 → MISSED
- Update tracking is safer and more comprehensive
