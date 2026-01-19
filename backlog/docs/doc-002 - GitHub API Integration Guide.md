---
id: doc-002
title: GitHub API Integration Guide
type: guide
created_date: '2025-10-03 15:21'
---

# GitHub API Integration Guide

## Overview

This guide documents everything we learned about integrating with the GitHub REST API, including gotchas, best practices, rate limits, and optimization strategies.

---

## Rate Limits - Critical Knowledge

### Core API (What We Use)

**Limits:**
- **5,000 requests per hour** per authenticated user
- Resets at the top of the hour
- Shared across all endpoints (except Search)

**Our Usage:**
- List repos: 1 request (+ pagination)
- Per PR: ~4 requests (get, reviews, issue comments, review comments)
- Example: 100 PRs = 1 + 100×4 = **401 requests**

**Monitoring:**
```typescript
const rateLimit = await client.checkRateLimit();
console.log(`${rateLimit.remaining}/${rateLimit.limit} remaining`);
console.log(`Resets at: ${new Date(rateLimit.reset * 1000)}`);
```

**Best Practice:**
- Check rate limit before large operations
- Monitor during sync (we show at start/end)
- Auto-throttle when remaining < 10

### Search API (Alternative)

**Limits:**
- **30 requests per minute** (1,800 per hour)
- **Separate quota** from core API
- **1,000 result limit** per search

**When to use:**
- Cross-repo searches
- Specific filters (author, labels, etc.)
- Small result sets (< 1000)

**When NOT to use:**
- Full org syncs (we need > 1000 PRs)
- Bulk data collection
- Already know which repos to query

---

## Critical API Gotchas

### 🚨 Gotcha #1: pulls.list vs pulls.get (MAJOR!)

**The Problem:**
```typescript
// This endpoint returns INCOMPLETE PR data
const prs = await octokit.pulls.list({ owner, repo });

// Missing fields:
// - additions ❌
// - deletions ❌  
// - changed_files ❌
// - comments ❌
// - review_comments ❌
// - commits ❌
```

**The Solution:**
```typescript
// Step 1: List PRs (get numbers)
const prList = await octokit.pulls.list({ owner, repo });

// Step 2: Get FULL details for each PR
for (const pr of prList) {
  const fullPR = await octokit.pulls.get({ 
    owner, 
    repo, 
    pull_number: pr.number 
  });
  // Now has additions, deletions, etc. ✅
}
```

**Why this happens:**
- List endpoint optimized for speed
- Full details would be too slow
- GitHub only returns subset of fields

**Impact on us:**
- Initially got Zod validation errors
- Had to add `fetchPullRequest()` method
- Extra API call per PR

**Cost:**
- Doubles PR-related requests (list + get per PR)
- Worth it for complete data!

### 🚨 Gotcha #2: Null vs Undefined vs Missing

**The Problem:**
```typescript
// GitHub API is inconsistent
user: null           // Sometimes null
user: undefined      // Sometimes undefined
additions: 0         // Sometimes 0
additions: undefined // Sometimes missing!
```

**The Solution:**
```typescript
// Zod schemas with proper handling
user: GitHubUserSchema.nullable()  // Explicitly nullable
additions: z.number().optional().default(0)  // Missing → 0
```

**In mappers:**
```typescript
author: githubPR.user?.login ?? 'unknown'  // Handle null/undefined
```

### 🚨 Gotcha #3: Pagination Isn't Automatic

**The Problem:**
```typescript
// Only gets first 100 results!
const prs = await octokit.pulls.list({ owner, repo });
// If repo has 500 PRs, you're missing 400!
```

**The Solution:**
```typescript
// Must paginate manually
let page = 1;
let allPRs = [];
while (true) {
  const response = await octokit.pulls.list({ 
    owner, 
    repo, 
    per_page: 100,
    page 
  });
  
  if (response.data.length === 0) break;
  allPRs.push(...response.data);
  page++;
}
```

**Our Implementation:**
- Async generator pattern
- Automatic pagination
- Configurable per_page (default 100)

### 🚨 Gotcha #4: Rate Limit Can Hit Suddenly

**The Problem:**
```typescript
// No rate limit checking
for (let i = 0; i < 6000; i++) {
  await octokit.pulls.get(...);  // Request 5001 fails!
}
```

**The Solution:**
```typescript
// Check before each operation
if (rateLimit.remaining < 10) {
  const waitTime = (rateLimit.reset * 1000) - Date.now();
  await sleep(waitTime);
}
```

**Our Implementation:**
- `throttleIfNeeded()` before each request
- Automatic waiting with countdown
- User sees: "Rate limit low, waiting 15 min..."

---

## Best Practices

### 1. **Always Use Pagination**

```typescript
// ✅ GOOD - Paginate
async function fetchAllPRs(owner, repo) {
  const allPRs = [];
  for await (const prs of paginate(...)) {
    allPRs.push(...prs);
  }
  return allPRs;
}

// ❌ BAD - Only first page
const prs = await octokit.pulls.list({ owner, repo });
```

### 2. **Validate All API Responses**

```typescript
// ✅ GOOD - Validate with Zod
const response = await octokit.pulls.get(...);
const pr = GitHubPullRequestSchema.parse(response.data);

// ❌ BAD - Unsafe type assertion
const pr = response.data as GitHubPullRequest;
```

**Why Zod?**
- GitHub API can change
- Fields can be null/undefined unexpectedly
- Get clear error messages
- Fail fast on API changes

### 3. **Implement Retry Logic**

```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (isPermError(error)) throw error;  // Don't retry 401, 404
      
      if (attempt < maxRetries) {
        const backoff = baseMs * Math.pow(2, attempt);
        await sleep(backoff);
      }
    }
  }
}
```

**Retry:** Network errors, rate limits, 5xx  
**Don't retry:** 401, 404, validation errors

### 4. **Monitor Rate Limits**

```typescript
// Check at start
const initial = await checkRateLimit();

// ... do work ...

// Check at end
const final = await checkRateLimit();
const used = initial.remaining - final.remaining;
console.log(`Used ${used} requests`);
```

### 5. **Use Conditional Requests (Future Optimization)**

```typescript
// ETags for caching
const response = await octokit.pulls.get({
  owner,
  repo,
  pull_number: 123,
  headers: {
    'If-None-Match': previousEtag
  }
});

// 304 Not Modified → Doesn't count against rate limit!
```

---

## Endpoint Reference

### Repositories

**List org repos:**
```typescript
GET /orgs/{org}/repos
Cost: 1 request per 100 repos
Returns: Simplified repo objects
Fields: name, pushed_at, archived, disabled
```

### Pull Requests

**List PRs (simplified):**
```typescript
GET /repos/{owner}/{repo}/pulls
Cost: 1 request per 100 PRs
Returns: Simplified PRs (missing metrics!)
Missing: additions, deletions, changed_files, comments, commits
```

**Get single PR (full details):**
```typescript
GET /repos/{owner}/{repo}/pulls/{number}
Cost: 1 request per PR
Returns: Complete PR object
Has: additions, deletions, changed_files, commits, etc. ✅
```

**⚠️ IMPORTANT:** Always use `pulls.get` for complete data!

### Reviews

**List reviews:**
```typescript
GET /repos/{owner}/{repo}/pulls/{number}/reviews
Cost: 1 request per 100 reviews
Returns: All reviews for a PR
Fields: id, user, state, body, submitted_at
```

### Comments

**Issue comments (general PR discussion):**
```typescript
GET /repos/{owner}/{repo}/issues/{number}/comments
Cost: 1 request per 100 comments
Returns: Top-level PR comments
```

**Review comments (inline code comments):**
```typescript
GET /repos/{owner}/{repo}/pulls/{number}/comments
Cost: 1 request per 100 comments
Returns: Inline code review comments
Fields: path, line (diff position)
```

**⚠️ Note:** Need BOTH for complete comment data!

---

## Cost Estimation

### Per Pull Request

**Minimum (no reviews/comments):**
- 1 request: pulls.get (full details)
- **Total: 1 request**

**Typical PR:**
- 1 request: pulls.get
- 1 request: list reviews
- 1 request: list issue comments
- 1 request: list review comments
- **Total: 4 requests**

**Large PR (100 comments, 50 reviews):**
- 1 request: pulls.get
- 1 request: list reviews (50 fits in 1 page)
- 2 requests: list issue comments (100 = 2 pages)
- 1 request: list review comments
- **Total: 5 requests**

### Per Repository

**Empty repo:**
- 1 request: pulls.list (returns empty array)
- **Total: 1 request**

**Typical repo (20 PRs, avg 2 reviews/PR, avg 3 comments/PR):**
- 1 request: pulls.list (20 PRs)
- 20 requests: pulls.get (full details)
- 20 requests: list reviews
- 20 requests: list issue comments
- 20 requests: list review comments
- **Total: 81 requests**

### Per Organization

**Small org (10 repos, 100 PRs total):**
- 1 request: repos.listForOrg
- 10 requests: pulls.list
- 400 requests: PR details/reviews/comments
- **Total: ~411 requests**

**Our org (79 repos, 50 PRs in 3 days):**
- 1 request: repos.listForOrg
- 14 requests: pulls.list (active repos only)
- 197 requests: PR details/reviews/comments
- **Total: 212 requests**

**Large org (500 repos, 10,000 PRs):**
- 5 requests: repos.listForOrg (pagination)
- 500 requests: pulls.list
- 40,000 requests: PR details/reviews/comments
- **Total: ~40,500 requests**
- **Problem:** Exceeds 5,000/hour limit!

**Solutions for large orgs:**
1. Batch by date (1 day at a time)
2. Use --repo to sync specific repos
3. Implement parallel syncing with queue
4. Schedule cron for continuous sync

---

## Optimization Strategies

### 1. **Filter Inactive Repos First** ✅ (Implemented)

```typescript
repos.filter(repo => {
  if (repo.archived || repo.disabled) return false;
  if (repo.pushed_at < startDate) return false;  // No activity!
  return true;
});
```

**Result:** 24% fewer requests in our org

### 2. **Smart Caching** ✅ (Implemented)

```typescript
const lastSync = getLastSync(repo);
if (lastSync.date >= endDate && !force) {
  skip();  // Already synced!
}
```

**Result:** Avoid re-fetching same data

### 3. **Parallel Syncing** ⚠️ (Not Implemented - Future)

```typescript
// Currently: Sequential
for (const repo of repos) {
  await syncRepo(repo);
}

// Could be: Parallel (with concurrency limit)
const results = await pMap(repos, syncRepo, { concurrency: 5 });
```

**Benefits:**
- 5x faster wall-clock time
- Same API request count
- Must respect rate limits

### 4. **Conditional Requests** ⚠️ (Not Implemented - Future)

```typescript
// Use ETags for caching
const response = await octokit.pulls.get({
  owner, repo, pull_number: 123,
  headers: { 'If-None-Match': etag }
});

// 304 Not Modified → FREE (doesn't count!)
```

**Benefits:**
- Unchanged resources are free
- Significant savings for unchanged PRs

### 5. **GraphQL API** ⚠️ (Alternative - Future)

```graphql
query {
  organization(login: "myorg") {
    repositories(first: 100) {
      nodes {
        pullRequests(first: 100) {
          nodes {
            # Get PR, reviews, comments in ONE request!
          }
        }
      }
    }
  }
}
```

**Benefits:**
- Fetch nested data in 1 request
- Much fewer API calls
- Different rate limit (points-based)

**Trade-offs:**
- More complex queries
- Different mental model
- Harder to paginate

---

## Common Errors & Solutions

### Error: "Bad credentials"

**Cause:** Invalid or missing GitHub token

**Solution:**
```bash
# Check .env
cat .env | grep GITHUB_TOKEN

# Generate new token
# https://github.com/settings/tokens
# Scopes needed: repo, read:org, read:user

# Update .env
echo "GITHUB_TOKEN=ghp_..." > .env
```

### Error: "Not Found"

**Cause:** Wrong org name or missing permissions

**Solution:**
```bash
# Check org name
echo $GITHUB_ORG

# Verify access
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/orgs/YOUR_ORG

# Check token scopes
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user \
  -I | grep x-oauth-scopes
```

### Error: "API rate limit exceeded"

**Cause:** Made > 5,000 requests in an hour

**Solution:**
```typescript
// Check when it resets
const rateLimit = await client.checkRateLimit();
const resetTime = new Date(rateLimit.reset * 1000);
console.log(`Resets at: ${resetTime}`);

// Wait or:
// 1. Use --repo to sync specific repo
// 2. Use --since to limit date range
// 3. Wait for reset
```

**Prevention:**
- Monitor rate limit during sync
- Filter inactive repos
- Use smart caching

### Error: Zod Validation Failed

**Example:**
```
Expected number, received undefined
Path: [0, "additions"]
```

**Cause:** GitHub API response missing expected field

**Solution:**
```typescript
// Make field optional in schema
additions: z.number().optional().default(0)

// Or investigate if API changed
// Check GitHub API docs for changes
```

**Our Experience:**
- `pulls.list` doesn't include metrics → Use `pulls.get`
- Fixed by making fields optional with defaults

---

## Response Data Structures

### Repository Object

**From:** `GET /orgs/{org}/repos`

```typescript
{
  id: 123456,
  name: "web-app",
  full_name: "myorg/web-app",
  private: true,
  archived: false,
  disabled: false,
  fork: false,
  pushed_at: "2025-10-03T12:00:00Z",  // Last push (IMPORTANT!)
  description: "Main web application"
}
```

**Key field:** `pushed_at` - Use for filtering inactive repos

### Pull Request (from pulls.list)

**Simplified version - MISSING METRICS:**
```typescript
{
  id: 789,
  number: 123,
  title: "Add feature",
  state: "open",
  user: { login: "alice" },
  created_at: "2025-10-01T00:00:00Z",
  // ❌ NO additions, deletions, changed_files!
  // ❌ NO comments, review_comments, commits!
}
```

### Pull Request (from pulls.get)

**Complete version - HAS EVERYTHING:**
```typescript
{
  id: 789,
  number: 123,
  title: "Add feature",
  state: "open",
  user: { login: "alice" },
  created_at: "2025-10-01T00:00:00Z",
  additions: 150,        // ✅ Has metrics!
  deletions: 50,         // ✅
  changed_files: 5,      // ✅
  comments: 3,           // ✅
  review_comments: 7,    // ✅
  commits: 4             // ✅
}
```

### Review Object

```typescript
{
  id: 456,
  user: { login: "bob" },
  state: "APPROVED",  // or CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING
  body: "Looks good!",
  submitted_at: "2025-10-01T12:00:00Z"
}
```

**States:**
- `APPROVED`: Approval
- `CHANGES_REQUESTED`: Requested changes
- `COMMENTED`: General review
- `DISMISSED`: Previously dismissed
- `PENDING`: Not submitted yet

### Comment Object

**Issue comment:**
```typescript
{
  id: 789,
  user: { login: "charlie" },
  body: "Great PR!",
  created_at: "2025-10-01T13:00:00Z"
  // No path/line (it's a general comment)
}
```

**Review comment:**
```typescript
{
  id: 790,
  user: { login: "diane" },
  body: "Fix this line",
  created_at: "2025-10-01T14:00:00Z",
  path: "src/file.ts",      // File being commented on
  line: 42,                  // Line number in diff
  position: 10               // Position in diff
}
```

---

## Our Implementation Decisions

### Decision 1: Repository-by-Repository vs Search API

**We chose:** Repository-by-Repository

**Reasoning:**
- No 1,000 result limit
- Higher rate limit (5000 vs 1800)
- Better caching (per-repo metadata)
- Clear visibility (which repos have activity)
- Error isolation (one repo fails, others continue)

**Trade-off:**
- More requests for sparse data
- Mitigated by filtering inactive repos

### Decision 2: Full PR Details for Every PR

**We chose:** Always call `pulls.get` per PR

**Reasoning:**
- Need metrics (additions, deletions, etc.)
- `pulls.list` doesn't have this data
- Worth the extra API call

**Cost:**
- Doubles PR-related requests
- 50 PRs = 50 extra requests
- Still well under 5,000 limit

### Decision 3: Separate Issue + Review Comments

**We chose:** Fetch both comment types

**Reasoning:**
- Different endpoints
- Different semantics (general vs inline)
- Track `type` field in domain model

**Cost:**
- 2 requests per PR (instead of 1)
- Complete comment data

### Decision 4: Filter Inactive Repos

**We chose:** Check `pushed_at` before syncing

**Reasoning:**
- Many repos have no recent activity
- Why fetch PRs if repo hasn't been pushed to?
- Saves API requests

**Result:**
- 79 repos → 14 active (65 filtered)
- 68 fewer requests (24% savings)

---

## Request Patterns

### Pattern 1: Sync Single Repo

```typescript
1. GET /repos/{owner}/{repo}/pulls          // List PRs
2. For each PR:
   GET /repos/{owner}/{repo}/pulls/{num}    // Full details
   GET /repos/{owner}/{repo}/pulls/{num}/reviews
   GET /repos/{owner}/{repo}/issues/{num}/comments
   GET /repos/{owner}/{repo}/pulls/{num}/comments
```

**Cost:** 1 + (N PRs × 4) requests

### Pattern 2: Sync All Repos

```typescript
1. GET /orgs/{org}/repos                    // List repos
2. For each active repo:
   - Pattern 1 (sync single repo)
```

**Cost:** 1 + Σ(per-repo costs)

**Optimization:** Filter by `pushed_at` first!

---

## Rate Limit Strategies

### Strategy 1: Monitoring

```typescript
// Before sync
const initial = await checkRateLimit();
console.log(`Starting with ${initial.remaining} requests`);

// After sync
const final = await checkRateLimit();
const used = initial.remaining - final.remaining;
console.log(`Used ${used} requests, ${final.remaining} remaining`);
```

### Strategy 2: Throttling

```typescript
if (rateLimit.remaining < 10) {
  const waitMs = (rateLimit.reset * 1000) - Date.now();
  console.log(`Waiting ${waitMs}ms for rate limit reset...`);
  await sleep(waitMs);
}
```

### Strategy 3: Batching

```typescript
// For large orgs: Batch by time
const dates = generateDateRanges(startDate, endDate, chunkSize);

for (const [start, end] of dates) {
  await sync({ startDate: start, endDate: end });
  
  // Check rate limit between batches
  const rl = await checkRateLimit();
  if (rl.remaining < 100) {
    await waitForReset(rl.reset);
  }
}
```

### Strategy 4: Parallelization (Future)

```typescript
// Sync multiple repos in parallel (with limit)
import pMap from 'p-map';

await pMap(repos, 
  async (repo) => await syncRepo(repo),
  { concurrency: 3 }  // Max 3 concurrent
);
```

**Benefits:**
- 3x faster wall-clock time
- Same total requests
- Must monitor rate limit carefully

---

## Debugging GitHub API Issues

### Enable Debug Logging

```bash
LOG_LEVEL=debug pnpm dev sync --repo web-app --since 1
```

### Inspect Raw Responses

```typescript
const response = await octokit.pulls.get({ owner, repo, pull_number: 123 });
console.log(JSON.stringify(response.data, null, 2));
// See exactly what GitHub returns
```

### Check Rate Limit Manually

```bash
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

### Test with Small Scope First

```bash
# Single repo, 1 day
pnpm dev sync --repo web-app --since 1

# Then expand
pnpm dev sync --repo web-app --since 7
pnpm dev sync --since 7  # All repos
```

---

## Real-World Examples from Our Testing

### Example 1: Small Sync (Single Repo, 3 Days)

```bash
pnpm dev sync --repo web-app --since 3
```

**Results:**
- 18 PRs
- 23 reviews
- 69 comments
- 73 API requests
- 34 seconds

**Quota usage:** 1.5% (73/5000)

### Example 2: Org-Wide Sync (All Repos, 3 Days)

```bash
pnpm dev sync --since 3
```

**Results:**
- 14 repos synced (65 filtered!)
- 49 PRs
- 68 reviews
- 184 comments
- 212 API requests
- 94 seconds

**Quota usage:** 4.2% (212/5000)

### Example 3: Larger Date Range (7 Days)

```bash
pnpm dev sync --since 7
```

**Results:**
- 30 PRs
- 49 reviews
- 136 comments
- ~280 requests
- ~120 seconds

**Quota usage:** 5.6% (280/5000)

### Example 4: Force Resync

```bash
pnpm dev sync --repo web-app --since 7 --force
```

**Behavior:**
- Ignores cache
- Re-fetches everything
- Same cost as first sync
- Useful for data correction

---

## API Response Validation with Zod

### Why We Validate Everything

**The problem:**
```typescript
// Unsafe - API could change!
const pr = response.data as GitHubPullRequest;
```

**Our solution:**
```typescript
// Safe - Validates at runtime
const pr = GitHubPullRequestSchema.parse(response.data);
```

**What it catches:**
- Missing fields (additions was undefined!)
- Wrong types (state was number instead of string)
- Unexpected nulls
- API version changes

### Example Validation Error

```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "undefined",
    "path": ["additions"],
    "message": "Required"
  }
]
```

**This told us:** `pulls.list` doesn't return `additions`!  
**Fix:** Use `pulls.get` instead.

---

## Testing Against GitHub API

### Strategy: Mock Octokit

```typescript
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn(() => ({
      pulls: { list: mockList, get: mockGet },
      // ... other endpoints
    }))
  };
});
```

**Benefits:**
- No real API calls in tests
- Fast test execution
- Deterministic results
- Test error cases

### Strategy: Integration Tests (Future)

```typescript
// Use real API with test org
const client = new GitHubClient(config);
const prs = await client.fetchPullRequests({ 
  repo: 'test-repo',
  limit: 5  // Keep it small!
});

// Verify against known data
expect(prs.length).toBeGreaterThan(0);
```

**Use sparingly:**
- Consumes real quota
- Slower
- Good for validation

---

## Lessons Learned

### 1. Always Fetch Full PR Details
**Lesson:** `pulls.list` returns incomplete data  
**Action:** Always call `pulls.get` for each PR  
**Cost:** Worth it for accurate metrics

### 2. Filter Before Fetching
**Lesson:** Many repos have no recent activity  
**Action:** Check `pushed_at` before syncing  
**Savings:** 24% fewer requests

### 3. Handle Retries Smartly
**Lesson:** Network errors happen  
**Action:** Retry transient errors, fail fast on permanent  
**Result:** Resilient sync

### 4. Validate Everything
**Lesson:** API responses can surprise you  
**Action:** Zod validation at every boundary  
**Result:** Caught `pulls.list` gotcha immediately

### 5. Monitor Rate Limits
**Lesson:** Easy to hit 5,000 limit with large orgs  
**Action:** Show quota at start/end, auto-throttle  
**Result:** Never hit limit, transparent to user

### 6. Isolate Errors
**Lesson:** One bad PR shouldn't kill entire sync  
**Action:** Try-catch per PR, per repo  
**Result:** Resilient, completes as much as possible

---

## Best Practices Summary

### ✅ DO:
- Use `pulls.get` for complete PR data
- Validate all responses with Zod
- Implement retry with exponential backoff
- Monitor rate limits
- Paginate all list endpoints
- Filter inactive repos
- Cache sync metadata
- Isolate errors (per-repo, per-PR)
- Show progress to user

### ❌ DON'T:
- Trust `pulls.list` for metrics (missing fields!)
- Use type assertions without validation
- Make requests without pagination
- Ignore rate limits
- Retry 401/404 errors
- Let one failure stop entire sync
- Sync archived repos
- Use Search API for bulk data (1000 limit)

---

## Quick Reference

### Rate Limits
| API | Limit | Quota | Use Case |
|-----|-------|-------|----------|
| Core (REST) | 5,000/hr | Shared | Bulk data, syncs |
| Search | 30/min (1,800/hr) | Separate | Targeted queries |
| GraphQL | 5,000 points/hr | Separate | Nested data |

### Request Costs
| Operation | Cost | Notes |
|-----------|------|-------|
| List org repos | 1 | Per 100 repos |
| List PRs | 1 | Per 100 PRs (incomplete!) |
| Get PR details | 1 | Per PR (complete ✅) |
| List reviews | 1 | Per 100 reviews |
| List comments | 1 | Per 100 comments |

### Endpoints Used
| Endpoint | What | Returns |
|----------|------|---------|
| `GET /orgs/{org}/repos` | Org repos | Repo list |
| `GET /repos/{o}/{r}/pulls` | PR list | Simplified PRs |
| `GET /repos/{o}/{r}/pulls/{n}` | Single PR | **Complete PR** ✅ |
| `GET /repos/{o}/{r}/pulls/{n}/reviews` | Reviews | All reviews |
| `GET /repos/{o}/{r}/issues/{n}/comments` | Issue comments | General comments |
| `GET /repos/{o}/{r}/pulls/{n}/comments` | Review comments | Inline comments |

---

## Future Optimizations

### 1. GraphQL Migration
- One request for PR + reviews + comments
- Significant request reduction
- Different rate limit system

### 2. Conditional Requests (ETags)
- 304 Not Modified = free!
- Great for unchanged PRs
- Requires ETag storage

### 3. Parallel Syncing
- Sync multiple repos concurrently
- 3-5x faster wall-clock time
- Must respect rate limits

### 4. Incremental Sync
- Only fetch new PRs since last sync
- Use `since` parameter on endpoints
- Much cheaper for frequent syncs

### 5. Webhook Integration
- Real-time updates instead of polling
- No API requests for webhooks
- Requires server setup

---

## Resources

- **GitHub REST API Docs:** https://docs.github.com/en/rest
- **Rate Limiting:** https://docs.github.com/en/rest/rate-limit
- **Octokit.js:** https://github.com/octokit/octokit.js
- **Zod:** https://zod.dev

---

## Summary

**Key Takeaways:**
1. `pulls.list` ≠ `pulls.get` (missing fields!)
2. Always validate with Zod
3. Monitor rate limits
4. Filter inactive repos
5. Retry transient errors
6. Isolate errors per-repo

**Our implementation:**
- Handles all gotchas
- Optimized for bulk syncs
- Resilient to failures
- Transparent about costs
- Production-ready

**Result:** Reliably sync 79 repos with only 212 API requests! 🎯
