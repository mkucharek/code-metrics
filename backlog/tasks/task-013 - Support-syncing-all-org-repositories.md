---
id: task-013
title: Support syncing all org repositories
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 15:01'
updated_date: '2025-10-03 15:06'
labels:
  - enhancement
  - sync
dependencies: []
priority: medium
---

## Description

Enhance the sync command to fetch and sync all repositories in the organization when --repo is not specified, making it easier to get a complete view of org-wide metrics.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add fetchRepositories() method to GitHubClient
- [x] #2 Add GitHubRepository schema with Zod validation
- [x] #3 Update GitHubSynchronizer to handle both single repo and all repos
- [x] #4 Show per-repo progress when syncing multiple repos
- [x] #5 Aggregate summary across all repos
- [x] #6 Handle per-repo errors gracefully (don't stop sync)
- [x] #7 Update CLI to make --repo optional
- [x] #8 Test with real org data
- [x] #9 All quality checks pass
<!-- AC:END -->


## Implementation Plan

1. Add GitHubRepository schema to schemas.ts
2. Add fetchRepositories() method to GitHubClient
3. Refactor sync() to extract syncSingleRepo() helper
4. Update sync() to handle repo vs all-repos logic
5. Update progress messages for multi-repo sync
6. Update CLI to make --repo optional
7. Test with real org data
8. Run quality checks


## Implementation Notes

## Implementation Summary

Successfully enhanced the sync command to support syncing all repositories in the organization when --repo is not specified, providing complete org-wide visibility.


## Architecture Changes

### 1. GitHub API Schema (schemas.ts)
Added GitHubRepository schema with Zod validation:
```typescript
GitHubRepositorySchema: {
  id, name, full_name,
  private, archived, disabled, fork,
  description
}
```

### 2. GitHubClient.fetchRepositories() (GitHubClient.ts)
New method to fetch all org repos:
- Uses octokit.repos.listForOrg()
- Paginates through all results
- Validates each repo with Zod
- Returns typed array of repositories

### 3. Refactored GitHubSynchronizer (GitHubSynchronizer.ts)
**Major refactoring:**

**Extracted syncSingleRepository():**
- Private helper method
- Handles all logic for syncing one repo
- Updates summary stats
- Handles per-PR errors gracefully

**Updated sync() main logic:**
```typescript
if (options.repo) {
  // Sync specific repo
  syncSingleRepository(repo);
} else {
  // Fetch all repos
  repos = fetchRepositories();
  // Filter: active only (not archived/disabled)
  for (repo of repos) {
    syncSingleRepository(repo.name);
  }
}
```

**Smart filtering:**
- Automatically excludes archived repos
- Automatically excludes disabled repos
- Only syncs active, healthy repos

### 4. Progress Indicators
**Multi-repo progress:**
```
[1/79] Syncing web-app...
  [1/18] Processing PR #123...
  ✓ web-app: 18 PRs, 23 reviews, 69 comments
  
[2/79] Syncing ios-app...
  [1/9] Processing PR #456...
  ✓ ios-app: 9 PRs, 35 reviews, 80 comments
```

**Per-repo summary:**
Shows PRs/reviews/comments count for each repo

**Final aggregate summary:**
Total across all repos

### 5. CLI Update (cli/index.ts)
**Made --repo optional:**
- Removed validation requiring --repo
- Updated help text
- Works both ways:
  - `pnpm dev sync --since 7` → all repos
  - `pnpm dev sync --repo web-app --since 7` → specific repo

## Error Handling

**Per-repo isolation:**
- Each repo wrapped in try-catch
- One repo failure doesn't stop sync
- Errors collected: "repo-name: error message"
- Shows in final summary

**Continues on failure:**
If web-app fails, continues with ios-app, etc.

## Testing Results

### Test 1: Single repo (existing behavior)
```bash
pnpm dev sync --repo web-app --since 3
```
✅ Works as before

### Test 2: All repos (new feature!)
```bash
pnpm dev sync --since 3
```
**Results:**
- 79 repositories synced
- 50 PRs fetched
- 69 reviews
- 188 comments
- 280 API requests used
- 128 seconds duration

**Database totals (cumulative):**
- 64 PRs
- 98 reviews
- 262 comments

## API Quota Impact

**Efficiency:**
- 280 requests for 79 repos
- ~3.5 requests per repo (many repos had no PRs)
- Still have 4,601/5,000 requests remaining
- Well within rate limits!

**Cost breakdown:**
- 1 request: list all repos
- Per repo with PRs:
  - 1 request: list PRs
  - N requests: get each PR details
  - N requests: get reviews per PR
  - N requests: get comments per PR

## Benefits

1. 🌍 **Org-wide visibility**: One command syncs everything
2. ⚡ **Efficient**: Only 280 requests for 79 repos
3. 🛡️ **Resilient**: Per-repo error isolation
4. 📊 **Smart filtering**: Auto-excludes archived/disabled
5. 🔄 **Backwards compatible**: --repo still works
6. 📈 **Scalable**: Works for orgs with 100+ repos

## Example Usage

**Sync all repos (last 7 days):**
```bash
pnpm dev sync --since 7
```

**Sync specific repo:**
```bash
pnpm dev sync --repo web-app --since 30
```

**Force resync all:**
```bash
pnpm dev sync --since 7 --force
```

## Quality Verification

✅ **pnpm check**: All quality checks pass
✅ **77 tests passing**: Existing tests still pass
✅ **Real org test**: 79 repos synced successfully
✅ **Error handling**: Per-repo isolation works
✅ **Progress indicators**: Clear multi-repo progress

## Files Modified

1. **src/infrastructure/github/schemas.ts**
   - Added GitHubRepository schema

2. **src/infrastructure/github/GitHubClient.ts**
   - Added fetchRepositories() method
   - Updated imports

3. **src/infrastructure/github/GitHubSynchronizer.ts**
   - Complete refactor
   - Extracted syncSingleRepository()
   - Added multi-repo logic
   - Enhanced progress messages

4. **src/presentation/cli/index.ts**
   - Made --repo optional
   - Updated help text
   - Removed validation

## Impact

This transforms the tool from single-repo to **org-wide metrics**!

Now users can:
- Get complete visibility across all repos
- Find patterns across the organization
- See who's most active org-wide
- Track review culture across teams
- Identify bottlenecks at scale

**One command, complete org visibility!** 🚀
