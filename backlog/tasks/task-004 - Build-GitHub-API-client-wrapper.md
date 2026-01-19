---
id: task-004
title: Build GitHub API client wrapper
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 11:20'
updated_date: '2025-10-03 13:55'
labels:
  - infrastructure
  - github
dependencies: []
priority: high
---

## Description

Create a robust wrapper around Octokit that handles authentication, rate limiting, pagination, and error handling. This ensures reliable data fetching from GitHub.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Octokit client initialized with authentication (token from env or config)
- [x] #2 Rate limit tracking and automatic throttling implemented
- [x] #3 Pagination helper that automatically fetches all pages
- [x] #4 Error handling with retries for transient failures
- [x] #5 TypeScript types for GitHub API responses
- [x] #6 Configuration loader for GitHub org name and token
- [x] #7 All quality checks pass (pnpm check: typecheck, lint, format:check)
- [x] #8 No 'any' types used - use specific types or 'unknown'
- [x] #9 Zod schemas used to validate GitHub API responses
<!-- AC:END -->


## Implementation Plan

1. Check Octokit is already installed and review config setup
2. Create GitHub API response Zod schemas (PR, Review, Comment types)
3. Build core GitHubClient class with authentication
4. Implement rate limit tracking and auto-throttling
5. Add pagination helper for fetching all pages
6. Implement retry logic for transient failures
7. Create typed methods for fetching PRs, reviews, and comments
8. Add comprehensive error handling
9. Write tests for the GitHub client (mocking Octokit)
10. Run all quality checks


## Implementation Notes

## Implementation Summary

Successfully built a robust GitHub API client wrapper around Octokit with comprehensive rate limiting, pagination, error handling, and full Zod validation for all API responses.


## Architecture & Components

### 1. GitHub API Response Schemas (schemas.ts)
Created comprehensive Zod schemas for validating all GitHub API responses:

**Core Schemas:**
- `GitHubUserSchema`: User/author information
- `GitHubPullRequestSchema`: Complete PR data (26 fields)
- `GitHubReviewSchema`: PR review data with state enum
- `GitHubCommentSchema`: Issue and review comments
- `GitHubRateLimitSchema`: Rate limit tracking
- `GitHubRateLimitResponseSchema`: Full rate limit response

**Validation Helpers:**
- `validatePullRequests()`: Validates array of PRs
- `validateReviews()`: Validates array of reviews
- `validateComments()`: Validates array of comments

All API responses validated at runtime with Zod - no unsafe type assertions!

### 2. GitHubClient Class (GitHubClient.ts)
Core client with production-ready features:

#### Authentication & Initialization
- Initializes Octokit with GitHub token from config
- Sets user agent: "engineering-metrics/1.0.0"
- Stores config for rate limiting and retries

#### Rate Limit Management
**Methods:**
- `checkRateLimit()`: Fetches current rate limit status
- `throttleIfNeeded()`: Auto-throttles when remaining < 10
- `getRateLimit()`: Returns cached rate limit info

**Features:**
- Tracks remaining API calls
- Automatically waits until rate limit resets
- Logs throttling status with countdown
- Validates rate limit response with Zod

#### Retry Logic with Exponential Backoff
**Method:** `retryWithBackoff<T>()`

**Features:**
- Configurable max retries (from config.rateLimit.maxRetries)
- Exponential backoff: backoffMs * 2^attempt
- Smart error handling:
  - ✅ Retries: Network errors, rate limit errors
  - ❌ No retry: Bad credentials, Not Found (404)
- Logs retry attempts with timing
- Calls throttleIfNeeded() before each attempt

#### Pagination
**Method:** `paginate<T>()` - Async generator

**Features:**
- Automatically fetches all pages (default 100 items/page)
- Memory efficient: yields results page by page
- Stops when page size < perPage (no more results)
- Works with all list endpoints

#### Data Fetching Methods

**fetchPullRequests(options):**
- Fetches all PRs for a repository
- Options: repo, state (open/closed/all), since (Date), limit
- Returns: `GitHubPullRequest[]`
- Filters by date (stops early if PRs older than `since`)
- Respects limit parameter
- Validates all PRs with Zod

**fetchReviews(repo, prNumber):**
- Fetches all reviews for a specific PR
- Returns: `GitHubReview[]`
- Paginates through all review pages
- Validates with Zod

**fetchIssueComments(repo, prNumber):**
- Fetches issue comments (general PR discussion)
- Returns: `GitHubComment[]`

**fetchReviewComments(repo, prNumber):**
- Fetches review comments (inline code review)
- Returns: `GitHubComment[]`

**fetchAllComments(repo, prNumber):**
- Fetches both issue AND review comments
- Uses Promise.all for parallel fetching
- Returns: `GitHubComment[]` (combined)

**Utility Methods:**
- `getOrganization()`: Returns configured GitHub org
- `sleep(ms)`: Promise-based sleep helper

### 3. Comprehensive Tests (GitHubClient.test.ts)
**9 test suites covering:**

1. **Constructor**: Client initialization with config
2. **Rate Limit Checking**: Fetches and parses rate limit
3. **fetchPullRequests**:
   - Fetches all PRs for a repo
   - Respects limit parameter
   - Filters by date with since parameter
4. **fetchReviews**: Fetches PR reviews
5. **fetchAllComments**: Combines issue + review comments
6. **getRateLimit**: Returns cached rate limit after check

**Mocking Strategy:**
- Mocked Octokit at module level
- Separate mock functions for each endpoint
- Clean, maintainable test setup
- All 9 tests passing ✅

### 4. Module Exports (index.ts)
Clean public API:
- `GitHubClient` class
- `FetchPRsOptions` type
- All schema types and validators
- Type-safe exports

## Configuration Integration

**Uses existing AppConfig:**
- `config.github.token`: GitHub PAT
- `config.github.organization`: Target org
- `config.github.rateLimit.maxRetries`: Retry attempts
- `config.github.rateLimit.backoffMs`: Base backoff time

No additional config needed - fully integrated!

## Type Safety Achievements

✅ **Zero unsafe type casts**
✅ **All API responses validated with Zod**
✅ **No 'any' types anywhere**
✅ **Proper error types**
✅ **Type-safe generic pagination**

### Runtime Validation Examples:

**Before (unsafe):**
```typescript
const prs = response.data as GitHubPullRequest[];
```

**After (safe with Zod):**
```typescript
const prs = validatePullRequests(response.data);
// Throws ZodError if data doesn't match schema
```

## Error Handling

### Transient Errors (retried):
- Network timeouts
- Rate limit exceeded
- 5xx server errors

### Permanent Errors (not retried):
- 401 Bad credentials → Auth issue
- 404 Not Found → Wrong repo/org
- Validation errors → API response changed

### User-Friendly Logging:
```
Rate limit low (9 remaining). Waiting 42s...
Request failed (attempt 1/3). Retrying in 1000ms...
```

## ESLint Configuration Update

Added Node.js timer globals to eslint.config.js:
- `setTimeout`, `clearTimeout`
- `setInterval`, `clearInterval`
- `Promise`

Prevents "no-undef" errors for standard Node.js APIs.

## Quality Verification

✅ **pnpm typecheck**: Zero TypeScript errors
✅ **pnpm lint**: All ESLint rules pass (including no-explicit-any)
✅ **pnpm format:check**: Prettier formatting perfect
✅ **pnpm test**: 77 tests passing (+9 new GitHub client tests)

## Files Created

1. **src/infrastructure/github/schemas.ts** (140 lines)
   - Zod schemas for all GitHub API responses
   - Validation helper functions

2. **src/infrastructure/github/GitHubClient.ts** (275 lines)
   - Main client class
   - Rate limiting, pagination, retries
   - All data fetching methods

3. **src/infrastructure/github/GitHubClient.test.ts** (280 lines)
   - 9 comprehensive test suites
   - Mocked Octokit
   - Tests for all methods

4. **src/infrastructure/github/index.ts** (18 lines)
   - Clean module exports

## Files Modified

- **eslint.config.js**: Added Node.js timer globals

## Usage Example

```typescript
import { GitHubClient } from './infrastructure/github';
import { getConfig } from './infrastructure/config';

const config = getConfig();
const client = new GitHubClient(config.github);

// Check rate limit
const rateLimit = await client.checkRateLimit();
console.log(`${rateLimit.remaining}/${rateLimit.limit} remaining`);

// Fetch PRs from last 30 days
const prs = await client.fetchPullRequests({
  repo: 'my-repo',
  state: 'all',
  since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
});

// Fetch all reviews for a PR
const reviews = await client.fetchReviews('my-repo', 123);

// Fetch all comments (issue + review)
const comments = await client.fetchAllComments('my-repo', 123);
```

## Benefits

1. 🛡️ **Type Safety**: Runtime validation matches compile-time
2. 🔄 **Resilience**: Auto-retry with exponential backoff
3. ⚡ **Efficiency**: Smart pagination and parallel fetching
4. 📊 **Visibility**: Rate limit tracking and logging
5. 🧪 **Testability**: Fully mocked and tested
6. 🎯 **Production-Ready**: Error handling for real-world scenarios

## Next Steps

This client is now ready to be used by:
- task-008: GitHub data synchronizer
- task-011: Application service layer

The synchronizer will use this client to fetch data and store it using the repository layer.
