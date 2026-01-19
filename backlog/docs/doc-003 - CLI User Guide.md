---
id: doc-003
title: CLI User Guide
type: guide
created_date: '2025-10-03 15:21'
---

# Engineering Metrics CLI - User Guide

## Overview

The Engineering Metrics CLI is a command-line tool for collecting GitHub data and computing engineering metrics for your organization. This guide covers all commands, options, and common usage patterns.

---

## Installation & Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure GitHub Access

Create a `.env` file in the project root:

```bash
# Copy example
cp .env.example .env

# Edit with your details
nano .env
```

**Required fields:**
```bash
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_ORG=your-organization-name
```

**Get your GitHub token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`, `read:user`
4. Copy the token to `.env`

**Optional fields:**
```bash
DATABASE_PATH=./data/metrics.db
LOG_LEVEL=info
NODE_ENV=development
GITHUB_RATE_LIMIT_MAX_RETRIES=3
GITHUB_RATE_LIMIT_BACKOFF_MS=1000
```

### 3. Verify Setup

```bash
# Check rate limit (verifies token)
pnpm dev sync --help
```

If you see the help text, you're ready! ✅

---

## Commands

### `metrics sync` - Sync GitHub Data

Fetch GitHub data (PRs, reviews, comments) and store locally.

#### Basic Usage

```bash
# Sync all repositories (last 30 days)
pnpm dev sync

# Sync specific repository (last 30 days)
pnpm dev sync --repo web-app

# Sync last 7 days
pnpm dev sync --since 7

# Sync specific date range
pnpm dev sync --since 2025-09-01 --until 2025-10-01
```

#### Options

| Option | Short | Description | Default | Example |
|--------|-------|-------------|---------|---------|
| `--repo <name>` | `-r` | Repository name (optional) | All repos | `--repo web-app` |
| `--since <date>` | `-s` | Start date | 30 days ago | `--since 7` or `--since 2025-09-01` |
| `--until <date>` | `-u` | End date | Now | `--until 2025-10-01` |
| `--force` | `-f` | Force resync (ignore cache) | false | `--force` |

#### Date Formats

**Days ago (number):**
```bash
--since 7    # Last 7 days
--since 30   # Last 30 days
--since 1    # Yesterday
```

**ISO date string:**
```bash
--since 2025-09-01
--since 2025-09-01T00:00:00Z
--until 2025-10-01
```

#### Examples

**Sync all repos (last 7 days):**
```bash
pnpm dev sync --since 7
```

**Sync specific repo (last 30 days):**
```bash
pnpm dev sync --repo web-app --since 30
```

**Sync with date range:**
```bash
pnpm dev sync --repo web-app --since 2025-09-01 --until 2025-09-30
```

**Force resync (ignore cache):**
```bash
pnpm dev sync --repo web-app --since 7 --force
```

**Sync all repos (specific dates):**
```bash
pnpm dev sync --since 2025-09-01 --until 2025-10-01
```

#### What Happens During Sync

1. **Initialization:**
   - Loads configuration from `.env`
   - Initializes SQLite database
   - Applies any pending migrations

2. **Rate Limit Check:**
   ```
   GitHub API: 5000/5000 requests remaining (resets in 60 min)
   ```

3. **Repository Discovery** (if --repo not specified):
   ```
   Fetching repositories from organization...
   Found 86 repositories
   Filtered: 72 inactive/archived (no activity since 2025-09-30)
   Syncing: 14 active repositories
   ```

4. **Per-Repo Sync:**
   ```
   [1/14] Syncing web-app...
     Fetching pull requests...
     Found 18 pull requests
     [1/18] Processing PR #3046: Add feature
       Fetching full PR details...
       Fetching reviews...
       Fetching comments...
       ✓ PR #3046: 0 reviews, 2 comments
     [2/18] Processing PR #3045: Fix bug
       ...
     ✓ web-app: 18 PRs, 23 reviews, 69 comments
   ```

5. **API Usage Summary:**
   ```
   API usage: 212 requests used, 4788 remaining
   ```

6. **Final Summary:**
   ```
   ═══════════════════════════════════════
            SYNC SUMMARY
   ═══════════════════════════════════════
   
   📊 Repositories synced:    14
   ⏭️  Repositories skipped:   65 (inactive)
   📋 Pull requests fetched:  49
   ⏭️  Pull requests skipped:  0
   👀 Reviews fetched:        68
   💬 Comments fetched:       184
   ⏱️  Duration:               94.23s
   
   ✅ Sync completed successfully!
   ```

---

### `metrics stats` - Database Statistics

Show quick overview of synced data.

#### Usage

```bash
pnpm dev stats
```

#### Output

```
📊 Database Statistics

Pull Requests: 64
Reviews:       98
Comments:      262
```

#### When to Use

- After sync to verify data
- Quick check of what's in database
- Before generating reports

---

### `metrics check` - Show Synced Data Ranges

Display what date ranges have been synced for each repository.

#### Usage

```bash
pnpm dev check
```

#### Output

```
📊 Synced Data Summary

  ✓ web-app (2025-09-26 to 2025-10-04)
    └─ 32 PRs • synced just now
  ✓ ios-app (2025-09-26 to 2025-10-04)
    └─ 10 PRs • synced 2h ago
  ✓ slate-backend (2025-09-26 to 2025-10-04)
    └─ 11 PRs • synced 2h ago

Total: 72 pull requests across 79 repositories

💡 Tip: Use pnpm dev sync --since <date> to sync more data
        Use pnpm dev report --since <date> to generate reports
```

#### When to Use

- Before generating reports to see what data is available
- To check if you need to sync more data
- To see which repositories have been synced

---

### `metrics report` - Generate Reports

Generate metrics reports from synced data.

#### Basic Usage

```bash
# Organization overview (last 30 days)
pnpm dev report

# Specific repository
pnpm dev report --repo web-app --since 7

# Individual engineer report
pnpm dev report --type engineer --engineer "John Doe" --since 30

# Team rankings
pnpm dev report --type rankings --since 30
```

#### Options

| Option | Short | Description | Default | Example |
|--------|-------|-------------|---------|---------|
| `--since <date>` | `-s` | Start date | 30 days ago | `--since 7` or `--since 2025-09-01` |
| `--until <date>` | `-u` | End date | End of today | `--until 2025-10-01` |
| `--type <type>` | `-t` | Report type | overview | `--type engineer` |
| `--engineer <name>` | `-e` | Specific engineer (for engineer type) | - | `--engineer "Alice"` |
| `--repo <name>` | `-r` | Filter by repository | All repos | `--repo web-app` |
| `--format <format>` | `-f` | Output format | markdown | `--format json` |
| `--output <file>` | `-o` | Save to file | stdout | `--output report.md` |
| `--include-bots` | - | Include bot users | false (hidden) | `--include-bots` |
| `--exclude-users <list>` | - | Exclude specific users | [] | `--exclude-users "bot1,bot2"` |

#### Report Types

**1. Overview (`--type overview`)** - Default
- All engineers with key metrics table
- Organization-wide summary
- Active repositories list

**2. Engineer (`--type engineer`)** - Requires `--engineer`
- Individual engineer deep dive
- PR statistics, code contribution, collaboration metrics
- Active repositories for that engineer

**3. Rankings (`--type rankings`)**
- Top PR creators
- Top reviewers
- Top code contributors
- Most collaborative (reviews + comments)

#### Output Formats

**Markdown (default):**
```bash
pnpm dev report --since 30                # stdout
pnpm dev report --since 30 --output report.md  # save to file
```

**JSON:**
```bash
pnpm dev report --since 30 --format json
pnpm dev report --since 30 --format json --output metrics.json
```

#### Data Validation

**Important:** Reports require synced data for the requested date range.

If data is missing, you'll see:
```
⚠️  Warning: No synced data found for requested date range

  Requested: 2025-08-01 to 2025-08-31
  Repository: web-app

💡 Sync data first with:
   pnpm dev sync --repo web-app --since 2025-08-01 --until 2025-08-31

Or use pnpm dev check to see available data
```

**Workflow:**
```bash
# 1. Check what's synced
pnpm dev check

# 2. Sync if needed
pnpm dev sync --since 2025-09-01 --until 2025-09-30

# 3. Generate report for same range
pnpm dev report --since 2025-09-01 --until 2025-09-30
```

---

### `metrics validate` - Validate Configuration

Test GitHub authentication and access before syncing.

#### Usage

```bash
pnpm dev validate
```

#### Output (Success)

```
✅ Configuration valid!

  ✓ Token: Valid
  ✓ Organization: your-org (accessible)
  ✓ Scopes: repo, read:org, read:user

Ready to sync! Run: pnpm dev sync
```

#### Output (Failure)

```
❌ Configuration invalid

  • Invalid GitHub token. Please check GITHUB_TOKEN in your .env file.
  • Generate a new token at: https://github.com/settings/tokens
```

#### When to Use

- First time setup
- After changing tokens
- Troubleshooting sync errors

---

## Date Range Guide

### Understanding Date Ranges

**All commands use the same date format:**
- **Days ago:** Number (e.g., `7` = last 7 days)
- **ISO date:** YYYY-MM-DD (e.g., `2025-09-01`)
- **ISO datetime:** Full ISO string (e.g., `2025-09-01T00:00:00Z`)

### Common Use Cases

#### Monthly Reports

```bash
# September 2025
pnpm dev sync --since 2025-09-01 --until 2025-09-30
pnpm dev report --since 2025-09-01 --until 2025-09-30

# Current month (partial - up to today)
pnpm dev sync --since 2025-10-01
pnpm dev report --since 2025-10-01
```

#### Quarterly Reports

```bash
# Q3 2025 (July-September)
pnpm dev sync --since 2025-07-01 --until 2025-09-30
pnpm dev report --since 2025-07-01 --until 2025-09-30

# Q4 2025 (October-December)
pnpm dev sync --since 2025-10-01 --until 2025-12-31
pnpm dev report --since 2025-10-01 --until 2025-12-31
```

#### Weekly Reports

```bash
# Week of Sept 1-7, 2025
pnpm dev sync --since 2025-09-01 --until 2025-09-07
pnpm dev report --since 2025-09-01 --until 2025-09-07

# Last 7 days (rolling window)
pnpm dev sync --since 7
pnpm dev report --since 7
```

#### Sprint Reports (2-week sprints)

```bash
# Sprint 23 (Sept 1-14)
pnpm dev sync --since 2025-09-01 --until 2025-09-14
pnpm dev report --since 2025-09-01 --until 2025-09-14

# Last 14 days
pnpm dev sync --since 14
pnpm dev report --since 14
```

### Best Practices

1. **Always sync before reporting:**
   ```bash
   # ✅ CORRECT
   pnpm dev sync --since 2025-09-01 --until 2025-09-30
   pnpm dev report --since 2025-09-01 --until 2025-09-30
   
   # ❌ WRONG - will fail with warning
   pnpm dev report --since 2025-09-01 --until 2025-09-30  # No sync first!
   ```

2. **Use same date range for sync and report:**
   - Ensures report has complete data
   - Avoid partial data issues

3. **Check available data first:**
   ```bash
   pnpm dev check  # See what's synced
   ```

4. **Use ISO dates for specific periods:**
   - Monthly: `2025-09-01` to `2025-09-30`
   - Quarterly: `2025-07-01` to `2025-09-30`
   - Avoid "days ago" for historical reports

5. **Use "days ago" for rolling windows:**
   - Last 7 days: `--since 7`
   - Last 30 days: `--since 30`
   - Good for recurring/automated reports

---

## Common Workflows

### Workflow 1: Daily Metrics Update

```bash
# Sync yesterday's data
pnpm dev sync --since 1

# Check what was synced
pnpm dev stats

# Generate report (future feature)
pnpm dev report --since 1
```

### Workflow 2: Weekly Team Report

```bash
# Sync last 7 days
pnpm dev sync --since 7

# Generate team metrics (future)
pnpm dev report --group-by author --since 7
```

### Workflow 3: Monthly Org Review

```bash
# Sync last 30 days (all repos)
pnpm dev sync --since 30

# Generate org-wide metrics (future)
pnpm dev report --type organization --since 30
```

### Workflow 4: Specific Repo Deep Dive

```bash
# Sync specific repo (6 months)
pnpm dev sync --repo web-app --since 180

# Generate detailed report (future)
pnpm dev report --repo web-app --detailed
```

### Workflow 5: Data Refresh

```bash
# Force resync to get latest data
pnpm dev sync --since 7 --force

# Verify
pnpm dev stats
```

---

## Caching Behavior

### How Caching Works

**SyncMetadata tracks:**
- Which repo was synced
- When it was synced (lastSyncAt)
- Date range synced (dateRangeStart → dateRangeEnd)
- How many items (itemsSynced)

**Cache hit logic:**
```
If repo.lastSyncAt >= options.endDate AND !force:
  → Skip sync (data already fresh)
Else:
  → Sync repo
```

### When Data is Re-Fetched

**Always re-fetched:**
- When --force flag is used
- When date range extends beyond last sync
- When repo not in cache
- First run (empty database)

**Skipped (cached):**
- Running same command twice
- Date range already covered
- Unless --force

### Examples

**First run:**
```bash
pnpm dev sync --since 7
# Fetches everything, takes 94s
```

**Second run (same command):**
```bash
pnpm dev sync --since 7
# Skips most repos (already synced)
# Takes < 5s
```

**Force resync:**
```bash
pnpm dev sync --since 7 --force
# Ignores cache, re-fetches everything
# Takes 94s again
```

**Extended date range:**
```bash
pnpm dev sync --since 14  # Extends beyond previous sync
# Fetches additional 7 days of data
```

---

## Rate Limit Management

### Understanding Your Quota

**GitHub provides:**
- 5,000 requests per hour
- Resets at top of hour
- Per authenticated user (per token)

**Our typical usage:**
- Small sync (1 repo, 7 days): ~73 requests (1.5%)
- Medium sync (all repos, 3 days): ~212 requests (4.2%)
- Large sync (all repos, 7 days): ~280 requests (5.6%)

### Monitoring Rate Limits

**At sync start:**
```
GitHub API: 5000/5000 requests remaining (resets in 60 min)
```

**At sync end:**
```
API usage: 212 requests used, 4788 remaining
```

**Manual check:**
```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### What Happens When Low

**Auto-throttling** (< 10 requests remaining):
```
Rate limit low (9 remaining). Waiting 847s until reset...
```

The tool automatically:
1. Detects low quota
2. Calculates wait time
3. Sleeps until reset
4. Continues sync

**Manual strategies:**
- Use --repo to sync specific repo
- Use shorter --since period
- Wait for quota reset
- Sync in batches

### Avoiding Rate Limits

**Best practices:**
1. **Filter by date:** `--since 3` instead of `--since 30`
2. **Specific repos:** `--repo web-app` when testing
3. **Smart caching:** Don't use --force unnecessarily
4. **Off-peak hours:** Sync when not actively using GitHub
5. **Batch large orgs:** Sync a few repos at a time

---

## Error Messages & Troubleshooting

### "Bad credentials"

**Error:**
```
✗ Sync failed: Bad credentials
```

**Cause:** Invalid GitHub token

**Solutions:**
1. Check token in .env: `cat .env | grep GITHUB_TOKEN`
2. Verify token hasn't expired: https://github.com/settings/tokens
3. Regenerate token if needed
4. Ensure token has required scopes: `repo`, `read:org`, `read:user`

### "Not Found"

**Error:**
```
✗ Error syncing web-app: Not Found
```

**Cause:** Repository doesn't exist or no access

**Solutions:**
1. Check repo name: `--repo web-app` (not `--repo myorg/web-app`)
2. Verify org name in .env: `echo $GITHUB_ORG`
3. Check token has access to org/repo
4. For private repos, ensure token has `repo` scope

### "Rate limit exceeded"

**Error:**
```
✗ API rate limit exceeded
```

**Cause:** Made > 5,000 requests in an hour

**Solutions:**
1. Wait for reset: Check "resets in X min" message
2. Use smaller --since value
3. Use --repo for specific repo
4. Avoid --force (uses cache)

### "Invalid date format"

**Error:**
```
✗ Invalid date format
```

**Cause:** Bad date in --since or --until

**Solutions:**
```bash
# ✅ Valid formats
--since 7                    # Days ago
--since 2025-09-01          # ISO date
--since 2025-09-01T00:00:00Z # ISO datetime

# ❌ Invalid formats
--since "last week"         # No text
--since 09-01-2025          # Wrong order
--since 9/1/2025            # Wrong format
```

### Zod Validation Errors

**Error:**
```
Expected number, received undefined
Path: [0, "additions"]
```

**Cause:** GitHub API response changed or missing field

**What to do:**
1. This shouldn't happen (our schemas handle this)
2. If it does, report as bug
3. Check GitHub API status
4. Try with --force to re-fetch

### Connection Errors

**Error:**
```
Request failed (attempt 1/3). Retrying in 1000ms...
Request failed (attempt 2/3). Retrying in 2000ms...
Request failed (attempt 3/3). Retrying in 4000ms...
✗ Sync failed: Network error
```

**Cause:** Network issues, GitHub downtime

**Solutions:**
1. Check internet connection
2. Check GitHub status: https://www.githubstatus.com
3. Wait and retry
4. Our retry logic handles transient issues automatically

---

## Performance Tips

### For Small Syncs (Fast)

```bash
# Single repo, recent data
pnpm dev sync --repo web-app --since 3
# ~30 seconds, ~73 requests
```

### For Complete Org Sync

```bash
# All repos, last 7 days
pnpm dev sync --since 7
# ~2 minutes, ~280 requests
```

### For Large Date Ranges

```bash
# Batch by month
pnpm dev sync --since 2025-09-01 --until 2025-09-30
pnpm dev sync --since 2025-08-01 --until 2025-08-31
pnpm dev sync --since 2025-07-01 --until 2025-07-31
```

### Testing Before Large Sync

```bash
# Test with 1 day first
pnpm dev sync --repo web-app --since 1

# Verify
pnpm dev stats

# Then expand
pnpm dev sync --since 7
```

---

## Understanding the Output

### Progress Messages

**Repository discovery:**
```
Fetching repositories from organization...
Found 86 repositories
Filtered: 72 inactive/archived (no activity since 2025-09-30)
Syncing: 14 active repositories
```

- **Found:** Total repos in org
- **Filtered:** Repos skipped (no recent activity or archived)
- **Syncing:** Active repos with recent commits

**Per-repo progress:**
```
[1/14] Syncing web-app...
  Fetching pull requests...
  Found 18 pull requests
  [1/18] Processing PR #3046: Title
    Fetching full PR details...
    Fetching reviews...
    Fetching comments...
    ✓ PR #3046: 0 reviews, 2 comments
  ✓ web-app: 18 PRs, 23 reviews, 69 comments
```

- **[1/14]:** Repo 1 of 14
- **[1/18]:** PR 1 of 18
- **✓ PR #3046:** Successfully processed
- **✓ web-app:** Repo summary

**Errors:**
```
[5/14] Syncing old-repo...
  ✗ Error processing PR #123: Validation failed
  ✓ old-repo: 4 PRs, 5 reviews, 10 comments
```

- **✗ Error:** Non-fatal error (sync continues)
- Individual PR failures don't stop repo
- Repo failures don't stop sync

### Summary Report

```
═══════════════════════════════════════
          SYNC SUMMARY
═══════════════════════════════════════

📊 Repositories synced:    14
⏭️  Repositories skipped:   65 (inactive)
📋 Pull requests fetched:  49
⏭️  Pull requests skipped:  0
👀 Reviews fetched:        68
💬 Comments fetched:       184
⏱️  Duration:               94.23s

✅ Sync completed successfully!

═══════════════════════════════════════
```

**Fields explained:**
- **Repositories synced:** Actually processed
- **Repositories skipped:** Filtered (inactive/archived)
- **Pull requests fetched:** Stored in database
- **Pull requests skipped:** Outside date range (from cache)
- **Reviews/Comments:** Total count
- **Duration:** Total time (includes API waits)

### API Usage

```
API usage: 212 requests used, 4788 remaining
```

- **Requests used:** How many API calls this sync made
- **Remaining:** How much quota you have left
- **Typical:** 3-4 requests per PR

---

### `metrics stats` - Database Statistics

Quick overview of what's in your local database.

#### Usage

```bash
pnpm dev stats
```

#### Output

```
📊 Database Statistics

Pull Requests: 64
Reviews:       98
Comments:      262
```

#### When to Use

- Verify sync worked
- Check current data volume
- Before generating reports
- After cleaning database

---

## Common Use Cases

### Use Case 1: Weekly Team Standup Metrics

**Goal:** Show last week's activity

```bash
# Monday morning
pnpm dev sync --since 7
pnpm dev stats

# Generate report (future)
pnpm dev report --since 7
```

### Use Case 2: Monthly Review

**Goal:** Analyze last month

```bash
# End of month
pnpm dev sync --since 30
pnpm dev report --since 30 --group-by author
```

### Use Case 3: Specific Project Deep Dive

**Goal:** Analyze one repo in detail

```bash
# Sync 6 months of data
pnpm dev sync --repo web-app --since 180

# Generate detailed report
pnpm dev report --repo web-app --detailed
```

### Use Case 4: New Org Setup

**Goal:** Bootstrap complete org history

```bash
# Sync 1 year (in batches)
pnpm dev sync --since 2024-01-01 --until 2024-03-31
pnpm dev sync --since 2024-04-01 --until 2024-06-30
pnpm dev sync --since 2024-07-01 --until 2024-09-30
pnpm dev sync --since 2024-10-01 --until 2025-01-01

# Or let rate limits guide you
pnpm dev sync --since 365  # Might take multiple hours
```

### Use Case 5: Compare Repos

**Goal:** See which repos are most active

```bash
# Sync all repos
pnpm dev sync --since 30

# Generate comparison (future)
pnpm dev report --compare-repos --since 30
```

---

## Smart Filtering Explained

### What Gets Filtered

**Automatically skipped:**
1. **Archived repositories:** Marked as archived on GitHub
2. **Disabled repositories:** Disabled by GitHub
3. **Inactive repositories:** No commits since startDate

**Example:**
```
Found 86 repositories
Filtered: 72 inactive/archived
Syncing: 14 active
```

### Why Filtering Matters

**Without filtering (79 repos):**
- 79 repos checked
- 280 API requests
- 128 seconds

**With filtering (14 active repos):**
- 14 repos synced
- 65 repos skipped
- 212 API requests (-68, 24% fewer!)
- 94 seconds (-34s, 26% faster!)

### Inactive Repo Example

```
Repo: old-legacy-app
Last pushed: 2023-05-15
Sync --since: 2025-09-30

Result: SKIPPED (no activity in 2+ years)
Saved: ~1-5 API requests
```

### Override Filtering

**To sync archived/inactive repos:**

Use --repo to specify:
```bash
pnpm dev sync --repo old-legacy-app --since 365
```

This bypasses the filter and syncs that specific repo.

---

## Data Storage

### Database Location

Default: `./data/metrics.db`

**Configure in .env:**
```bash
DATABASE_PATH=/custom/path/metrics.db
```

### Database Contents

**Tables:**
- `pull_requests`: All PRs with full details
- `reviews`: All PR reviews
- `comments`: All comments (issue + review)
- `sync_metadata`: Sync state tracking
- `migrations`: Schema version history

**Indexes:**
- By author (fast author queries)
- By date (fast time range queries)
- By repository (fast repo queries)

### Backup Your Data

```bash
# Simple backup
cp data/metrics.db data/metrics-backup-$(date +%Y%m%d).db

# Verify
ls -lh data/
```

### Reset Database

```bash
# Delete database
rm data/metrics.db

# Resync from scratch
pnpm dev sync --since 30
```

---

## Configuration Reference

### Environment Variables

**GitHub:**
```bash
GITHUB_TOKEN=ghp_...           # Required
GITHUB_ORG=myorg               # Required
GITHUB_RATE_LIMIT_MAX_RETRIES=3
GITHUB_RATE_LIMIT_BACKOFF_MS=1000
```

**Database:**
```bash
DATABASE_PATH=./data/metrics.db
DATABASE_VERBOSE=false
DATABASE_WAL_MODE=true
```

**Logging:**
```bash
LOG_LEVEL=info    # debug, info, warn, error
LOG_COLORED=true
```

**Application:**
```bash
NODE_ENV=development  # development, production, test
```

### Configuration File (Optional)

Create `metrics.config.json`:
```json
{
  "github": {
    "organization": "myorg",
    "rateLimit": {
      "maxRetries": 5,
      "backoffMs": 2000
    }
  },
  "database": {
    "path": "./custom/metrics.db"
  }
}
```

**Precedence:**
```
CLI flags > Config file > Environment variables > Defaults
```

---

## Advanced Usage

### Custom Date Ranges

**Last quarter:**
```bash
pnpm dev sync --since 2025-07-01 --until 2025-09-30
```

**Specific week:**
```bash
pnpm dev sync --since 2025-09-15 --until 2025-09-22
```

**Year to date:**
```bash
pnpm dev sync --since 2025-01-01
```

### Syncing Multiple Specific Repos

```bash
# Sync repos one by one
pnpm dev sync --repo web-app --since 30
pnpm dev sync --repo ios-app --since 30
pnpm dev sync --repo api-server --since 30
```

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug pnpm dev sync --repo web-app --since 1

# See all API requests, responses, etc.
```

### Testing Configuration

```bash
# Verify config loads correctly
node -e "
  const { getConfig } = require('./dist/infrastructure/config');
  console.log(JSON.stringify(getConfig(), null, 2));
"
```

---

## Performance Benchmarks

### Real-World Examples

**Small org (10 repos, 100 PRs):**
- Repos: 10 synced, 0 skipped
- PRs: 100
- Requests: ~411
- Time: ~60 seconds

**Our org (79 repos, 50 PRs in 3 days):**
- Repos: 14 synced, 65 skipped
- PRs: 50
- Requests: 212
- Time: 94 seconds

**Large org (500 repos, 1000 PRs):**
- Repos: ~50 synced, 450 skipped
- PRs: 1000
- Requests: ~4,050
- Time: ~15 minutes
- Note: Close to 5,000 limit!

### Request Breakdown

**Per PR (typical):**
- 1 request: pulls.get (full details)
- 1 request: list reviews (usually < 100)
- 1 request: list issue comments
- 1 request: list review comments
- **Total: 4 requests**

**Per repo with PRs:**
- 1 request: pulls.list
- N × 4 requests: per PR
- **Total: 1 + (N × 4)**

**Per repo without PRs:**
- 1 request: pulls.list (returns empty)
- **Total: 1 request**

**Org-wide:**
- 1 request: repos.listForOrg
- Sum of per-repo costs
- **Total: 1 + Σ(repo costs)**

---

## Tips & Tricks

### 1. Start Small

```bash
# Test with 1 day first
pnpm dev sync --repo web-app --since 1

# Verify it worked
pnpm dev stats

# Then expand
pnpm dev sync --since 7
```

### 2. Use Stats to Verify

```bash
# After any sync
pnpm dev stats

# Should show new data
```

### 3. Force Only When Needed

```bash
# ❌ Wasteful - re-fetches everything
pnpm dev sync --force

# ✅ Better - cache works
pnpm dev sync

# ✅ Force only when data corrupted
pnpm dev sync --force --since 1
```

### 4. Check Rate Limit Before Big Sync

```bash
# See current quota
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit | jq .rate

# If low, wait or adjust sync scope
```

### 5. Sync During Off-Peak

```bash
# Schedule for night/weekend
crontab -e

# Every night at 2 AM
0 2 * * * cd /path/to/metrics && pnpm dev sync --since 1
```

---

## FAQ

### Q: How often should I sync?

**Answer:** Depends on your needs:
- **Daily:** Use `--since 1` (yesterday's data)
- **Weekly:** Use `--since 7` (last week)
- **Monthly:** Use `--since 30` (last month)
- **Real-time:** Not supported (use webhooks in future)

### Q: Does it sync closed PRs?

**Answer:** Yes! `--state all` includes open and closed.

### Q: Can I sync private repos?

**Answer:** Yes, if your token has `repo` scope.

### Q: What happens if sync is interrupted?

**Answer:** 
- Already-synced data remains in DB
- Re-run sync to continue
- Smart caching picks up where left off
- No duplicate data (UNIQUE constraints)

### Q: Can I sync forks?

**Answer:** Yes, forks are included unless filtered.

To exclude forks in future: Filter in code or use --exclude-forks flag (future feature).

### Q: How much disk space does it use?

**Answer:** 
- Small org (100 PRs): ~500 KB
- Medium org (1,000 PRs): ~5 MB
- Large org (10,000 PRs): ~50 MB
- SQLite is very efficient!

### Q: Can I export the data?

**Answer:** 
- Current: SQLite database (query with any SQLite tool)
- Future: JSON export, CSV export, API (task-011)

### Q: What if my org has 1000+ repos?

**Answer:**
- Filtering helps (inactive repos skipped)
- Use batching (sync 100 repos at a time)
- Takes longer but works fine
- Consider parallel sync (future optimization)

---

## Cheat Sheet

### Quick Commands

```bash
# Sync everything (last 7 days)
pnpm dev sync --since 7

# Sync specific repo (last 30 days)
pnpm dev sync --repo web-app --since 30

# Force resync
pnpm dev sync --since 7 --force

# Check database
pnpm dev stats

# Help
pnpm dev sync --help
pnpm dev --help
```

### Date Shortcuts

```bash
--since 1     # Yesterday
--since 3     # Last 3 days
--since 7     # Last week
--since 14    # Last 2 weeks
--since 30    # Last month
--since 90    # Last quarter
--since 365   # Last year
```

### Configuration Quick Setup

```bash
# Minimal .env
cat > .env << EOF
GITHUB_TOKEN=ghp_your_token
GITHUB_ORG=your_org
EOF

# Test
pnpm dev sync --repo test-repo --since 1
```

---

## Best Practices

### ✅ DO:
- Start with small syncs (--since 3)
- Use --repo when testing
- Check stats after sync
- Monitor rate limits
- Use cache (avoid --force)
- Sync during off-peak hours
- Keep token secure (.env in .gitignore)

### ❌ DON'T:
- Commit .env file
- Use --force unnecessarily
- Sync huge date ranges without testing
- Ignore rate limit warnings
- Share your GitHub token
- Run multiple syncs in parallel (manually)

---

## Next Steps

After syncing data, you can:
1. **Generate reports** (task-006 - future)
2. **Compute metrics** (already have the functions!)
3. **Query database** (use any SQLite tool)
4. **Export data** (future feature)

---

## Support

### Issues?
- Check this guide first
- Check TROUBLESHOOTING.md (future)
- Check GitHub API status
- Review error messages carefully

### Want to contribute?
- See CONTRIBUTING.md
- See ARCHITECTURE.md for design
- Follow project coding standards

---

## Summary

**The metrics CLI makes it easy to:**
- ✅ Sync GitHub data (one command!)
- ✅ Handle large organizations (79+ repos)
- ✅ Stay under rate limits (smart filtering)
- ✅ Cache intelligently (avoid redundant fetches)
- ✅ Recover from errors (resilient sync)
- ✅ Track progress (real-time updates)

**Simple usage:**
```bash
pnpm dev sync --since 7
```

**That's it!** The tool handles the complexity. 🎯
