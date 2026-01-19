---
id: doc-001
title: Architecture
type: guide
created_date: '2025-10-03 15:21'
---

# Engineering Metrics Platform - Architecture Guide

## Overview

The Engineering Metrics Platform is a TypeScript-based CLI tool that collects GitHub data from an organization and computes engineering metrics. The system follows **Clean Architecture** principles with clear separation of concerns across four distinct layers.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│         Presentation Layer                  │
│    (CLI, Commands, User Interface)          │
├─────────────────────────────────────────────┤
│         Application Layer                   │
│   (Use Cases, Orchestration, Services)      │
├─────────────────────────────────────────────┤
│         Domain Layer                        │
│  (Business Logic, Entities, Metrics)        │
├─────────────────────────────────────────────┤
│       Infrastructure Layer                  │
│  (GitHub API, Database, Configuration)      │
└─────────────────────────────────────────────┘
```

### Layer 1: Domain Layer (Core Business Logic)

**Location:** `src/domain/`

**Purpose:** Pure business logic with no external dependencies

**Components:**

1. **Models** (`src/domain/models/`)
   - `PullRequest`: Core PR entity (20 fields)
   - `Review`: PR review entity
   - `Comment`: Comment entity (issue + review)
   - `DateRange`: Time period representation
   - `MetricsData`: Aggregate metrics types
   - Type guards for runtime validation

2. **Metrics** (`src/domain/metrics/`)
   - `engineer-metrics.ts`: Individual contributor metrics
     - PRs created, reviews given, lines changed
     - Merge rate, avg PR size, net lines
   - `organization-metrics.ts`: Org-wide aggregates
     - Total counts, averages, summaries
     - Rankings by metric
     - Statistical computations (min, max, median, avg)

**Key Principles:**
- ✅ No dependencies on infrastructure
- ✅ Pure functions (no side effects)
- ✅ Fully testable in isolation
- ✅ Type-safe with strict TypeScript

---

### Layer 2: Infrastructure Layer (External Integrations)

**Location:** `src/infrastructure/`

**Purpose:** Handle external systems (GitHub API, Database, Config)

**Components:**

#### 2.1. GitHub API Client (`src/infrastructure/github/`)

**GitHubClient.ts:**
- Octokit wrapper with production features
- Rate limit tracking and auto-throttling
- Retry logic with exponential backoff
- Pagination (async generator pattern)
- Methods:
  - `fetchRepositories()`: All org repos
  - `fetchPullRequests()`: PRs for a repo
  - `fetchPullRequest()`: Single PR with full details
  - `fetchReviews()`: Reviews for a PR
  - `fetchIssueComments()`: Issue comments
  - `fetchReviewComments()`: Review comments
  - `checkRateLimit()`: Current quota status

**schemas.ts:**
- Zod schemas for all GitHub API responses
- GitHubPullRequest, GitHubReview, GitHubComment
- GitHubRepository, GitHubRateLimit
- Validation helpers

**GitHubSynchronizer.ts:**
- Orchestrates data fetching and storage
- Multi-repo sync support
- Smart filtering (archived/inactive repos)
- Progress callbacks
- Error isolation (per-repo, per-PR)
- Sync metadata tracking

**mappers.ts:**
- Converts GitHub API types → Domain models
- Handles nullable fields
- Type-safe transformations

#### 2.2. Storage Layer (`src/infrastructure/storage/`)

**database.ts:**
- SQLite initialization with better-sqlite3
- WAL mode for better concurrency
- Foreign keys enabled

**schemas.ts:**
- SQL DDL for all tables
- Indexes for query performance
- Constraints (UNIQUE, FOREIGN KEY, CHECK)

**migrations/** (Version-based migration system)
- `Migration.ts`: Migration utilities
  - `getCurrentVersion()`: Get DB version
  - `applyMigrations()`: Apply pending migrations
  - `getAppliedMigrations()`: Migration history
- `001-initial-schema.ts`: Initial DB schema
- `ALL_MIGRATIONS`: Ordered migration list

**repositories/** (Repository Pattern)
- `PRRepository.ts`: CRUD for pull requests
- `ReviewRepository.ts`: CRUD for reviews
- `CommentRepository.ts`: CRUD for comments
- `SyncMetadataRepository.ts`: Sync state tracking
- All use Zod for validation
- Query methods: findByAuthor, findByDateRange, etc.

**query-schemas.ts:**
- Zod schemas for SQL query results
- CountResultSchema, AuthorResultSchema, etc.
- Helpers: validateQueryResult, validateQueryResults

#### 2.3. Configuration (`src/infrastructure/config/`)

**schema.ts:**
- Comprehensive Zod schemas for all config
- GitHubConfig, DatabaseConfig, LoggingConfig
- Defaults for all optional fields

**loader.ts:**
- Multi-source config loading
- Sources: .env → config file → CLI overrides
- Precedence: overrides > file > env > defaults
- Singleton pattern with caching
- Deep merge for nested objects

---

### Layer 3: Application Layer (Use Cases)

**Location:** `src/application/` (Future - task-011)

**Purpose:** Orchestrate domain and infrastructure

**Planned Components:**
- MetricsService: Coordinate sync + computation
- ReportService: Generate reports from data
- Use case implementations

---

### Layer 4: Presentation Layer (User Interface)

**Location:** `src/presentation/`

**Purpose:** User interaction (CLI)

**Components:**

**cli/index.ts:**
- Commander.js setup
- Commands:
  - `sync`: Sync GitHub data
    - Options: --repo, --since, --until, --force
    - Supports single repo or all repos
    - Real-time progress with ora spinner
    - Colored output with chalk
  - `stats`: Database statistics
- Error handling and user feedback

---

## Data Flow

### Complete Sync Flow

```
User runs: pnpm dev sync --since 7
    ↓
CLI (presentation/cli/index.ts)
  - Parse options
  - Load config from .env
  - Initialize database
  - Apply migrations
  - Create repositories
    ↓
GitHubClient (infrastructure/github/GitHubClient.ts)
  - Authenticate with Octokit
  - Check rate limit
  - Fetch repositories (if --repo not specified)
  - Filter: active repos only
    ↓
GitHubSynchronizer (infrastructure/github/GitHubSynchronizer.ts)
  - For each repo:
    - Fetch PRs list
    - For each PR:
      - Fetch full PR details (pulls.get)
      - Fetch reviews
      - Fetch comments (issue + review)
      - Convert to domain models (mappers)
      - Save to database (repositories)
    ↓
Repositories (infrastructure/storage/repositories/)
  - Validate with Zod (DBPullRequestSchema)
  - Insert/update SQLite
  - Update sync metadata
    ↓
SQLite Database (data/metrics.db)
  - Tables: pull_requests, reviews, comments, sync_metadata
  - Indexed for performance
  - WAL mode for concurrency
    ↓
CLI displays summary:
  - Repos synced
  - PRs/reviews/comments fetched
  - API usage
  - Duration
```

---

## Key Design Decisions

### 1. **Clean/Hexagonal Architecture**
**Why:** Separation of concerns, testability, maintainability

**Benefits:**
- Domain logic independent of infrastructure
- Easy to swap implementations (SQLite → Postgres)
- Clear boundaries between layers
- Highly testable

### 2. **Zod for All External Data**
**Why:** Runtime validation matches compile-time guarantees

**Used for:**
- GitHub API responses
- Database query results
- Configuration files
- Environment variables
- JSON.parse() outputs

**Benefits:**
- Catches API changes early
- Clear error messages
- Type safety at runtime
- Self-documenting schemas

### 3. **Repository Pattern**
**Why:** Abstract database operations from business logic

**Benefits:**
- Easy to test (mock repositories)
- Swappable storage backends
- Clean query API
- Centralized data access

### 4. **SQLite with better-sqlite3**
**Why:** Simple, fast, synchronous, local storage

**Benefits:**
- No separate database server
- Synchronous API (simpler code)
- ACID guarantees
- Fast for read-heavy workloads
- Easy backup (copy file)

**Trade-offs:**
- Single writer (fine for CLI)
- Not distributed (fine for local tool)

### 5. **Migration System**
**Why:** Version database schema changes

**Benefits:**
- Reproducible schema
- Safe upgrades
- Rollback capability (with down migrations)
- Tracks what's been applied

### 6. **Rate Limit Management**
**Why:** GitHub API has strict limits

**Strategy:**
- Track remaining quota
- Auto-throttle when low (<10 remaining)
- Retry with exponential backoff
- Show usage to user

**Benefits:**
- Never hit rate limit
- Graceful degradation
- Transparent to user

### 7. **Smart Caching**
**Why:** Avoid redundant API calls

**Strategy:**
- Track last sync per repo (SyncMetadata)
- Skip if already synced (unless --force)
- Filter inactive repos by pushed_at

**Benefits:**
- 24% fewer API requests
- 26% faster sync
- Preserves quota

### 8. **Per-Repo Error Isolation**
**Why:** One bad repo shouldn't kill entire sync

**Strategy:**
- Try-catch around each repo
- Collect errors in summary
- Continue with next repo

**Benefits:**
- Resilient to failures
- Complete as much as possible
- Clear error reporting

---

## Component Interactions

### GitHub Sync Flow

```
GitHubClient
  ↓ (calls)
Octokit (external)
  ↓ (returns)
GitHub API Response (unknown)
  ↓ (validates)
Zod Schema
  ↓ (produces)
Typed GitHub object (GitHubPullRequest)
  ↓ (maps)
Mapper (mapPullRequest)
  ↓ (produces)
Domain Model (PullRequest)
  ↓ (saves)
Repository (PRRepository)
  ↓ (validates)
Zod Schema (DBPullRequestSchema)
  ↓ (inserts)
SQLite Database
```

### Metrics Computation Flow (Future)

```
CLI: "generate report"
  ↓
Application Service
  ↓ (loads data)
Repositories
  ↓ (returns)
Domain Models (PullRequest[])
  ↓ (computes)
Domain Metrics Functions
  ↓ (produces)
EngineerMetrics[]
  ↓ (formats)
Report Generator
  ↓ (outputs)
Markdown Report
```

---

## Directory Structure

```
src/
├── domain/                    # Business logic (pure)
│   ├── models/               # Domain entities
│   │   ├── PullRequest.ts    # PR entity + type guard
│   │   ├── Review.ts         # Review entity
│   │   ├── Comment.ts        # Comment entity
│   │   ├── DateRange.ts      # Date range value object
│   │   └── MetricsData.ts    # Metrics types
│   └── metrics/              # Metrics computation
│       ├── engineer-metrics.ts      # Individual metrics
│       └── organization-metrics.ts  # Org aggregates
│
├── infrastructure/            # External integrations
│   ├── github/               # GitHub API client
│   │   ├── GitHubClient.ts         # API wrapper
│   │   ├── GitHubSynchronizer.ts   # Sync orchestrator
│   │   ├── schemas.ts              # API response schemas
│   │   └── mappers.ts              # API → Domain converters
│   ├── storage/              # Database layer
│   │   ├── database.ts             # DB initialization
│   │   ├── schemas.ts              # SQL DDL
│   │   ├── query-schemas.ts        # SQL result schemas
│   │   ├── migrations/             # Schema versions
│   │   │   ├── Migration.ts        # Migration system
│   │   │   ├── 001-initial-schema.ts
│   │   │   └── index.ts
│   │   └── repositories/           # Data access
│   │       ├── PRRepository.ts
│   │       ├── ReviewRepository.ts
│   │       ├── CommentRepository.ts
│   │       └── SyncMetadataRepository.ts
│   └── config/               # Configuration
│       ├── schema.ts               # Config schemas
│       └── loader.ts               # Multi-source loader
│
├── application/              # Use cases (future - task-011)
│   └── services/
│
└── presentation/             # User interface
    └── cli/
        └── index.ts          # CLI commands
```

---

## Key Patterns

### 1. **Dependency Injection**

```typescript
// Dependencies injected via constructor
class GitHubSynchronizer {
  constructor(
    private githubClient: GitHubClient,
    private prRepository: PRRepository,
    private reviewRepository: ReviewRepository,
    private commentRepository: CommentRepository,
    private syncMetadataRepository: SyncMetadataRepository
  ) {}
}
```

**Benefits:**
- Easy to test (inject mocks)
- Explicit dependencies
- Loose coupling

### 2. **Repository Pattern**

```typescript
interface Repository<T> {
  save(entity: T): void;
  findById(id: number): T | null;
  findAll(): T[];
  // ... query methods
}
```

**Benefits:**
- Abstract storage details
- Consistent API
- Easy to swap implementations

### 3. **Async Generator for Pagination**

```typescript
async *paginate<T>(fetchPage: (page, perPage) => Promise<T[]>) {
  let page = 1;
  while (hasMore) {
    const results = await fetchPage(page, 100);
    yield results;
    hasMore = results.length === 100;
    page++;
  }
}
```

**Benefits:**
- Memory efficient
- Lazy evaluation
- Clean abstraction

### 4. **Runtime Validation with Zod**

```typescript
// Every external input validated
const pr = GitHubPullRequestSchema.parse(apiResponse);
const row = DBPullRequestSchema.parse(dbRow);
const config = AppConfigSchema.parse(configFile);
```

**Benefits:**
- Runtime safety = compile-time safety
- Clear error messages
- Catches data corruption early
- Self-documenting

### 5. **Mapper Pattern**

```typescript
// Convert between layers
function mapPullRequest(githubPR: GitHubPullRequest): PullRequest {
  return {
    id: githubPR.id,
    // ... transform fields
  };
}
```

**Benefits:**
- Decouples layers
- Type-safe conversions
- Single responsibility

### 6. **Configuration Precedence**

```
Defaults → Environment Variables → Config File → CLI Overrides
```

**Benefits:**
- Flexible configuration
- Sensible defaults
- Environment-specific configs
- Runtime overrides

---

## Type Safety Strategy

### 1. **Strict TypeScript**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### 2. **No 'any' Type**
- ESLint rule: `@typescript-eslint/no-explicit-any: error`
- Use specific types or `unknown`
- Always validate unknown with type guards or Zod

### 3. **Zod at Boundaries**
All external data validated:
- ✅ GitHub API responses
- ✅ Database query results
- ✅ Configuration files
- ✅ Environment variables
- ✅ JSON.parse() outputs

### 4. **Type Guards for Runtime Checks**
```typescript
if (isPullRequest(obj)) {
  // TypeScript knows obj is PullRequest
}
```

---

## Error Handling Strategy

### 1. **Layered Error Handling**

**GitHub Client:**
- Retry transient errors (network, rate limit)
- Don't retry permanent errors (401, 404)
- Exponential backoff

**Synchronizer:**
- Per-PR try-catch (isolate failures)
- Per-repo try-catch (continue on error)
- Collect all errors in summary

**CLI:**
- Top-level try-catch
- User-friendly error messages
- Stack traces in debug mode

### 2. **Error Types**

**Transient (retry):**
- Network timeouts
- Rate limit exceeded
- 5xx server errors

**Permanent (fail fast):**
- 401 Bad credentials
- 404 Not Found
- Zod validation errors

### 3. **Graceful Degradation**

```typescript
// One PR fails → Continue with next
// One repo fails → Continue with next repo
// API call fails → Retry with backoff
```

---

## Performance Optimizations

### 1. **Smart Repository Filtering**
- Skip archived repos
- Skip disabled repos
- Skip repos with no activity in date range
- **Result:** 24% fewer API requests

### 2. **Caching with SyncMetadata**
- Track last sync per repo
- Skip already-synced data (unless --force)
- **Result:** Avoid redundant fetches

### 3. **Efficient Pagination**
- Async generators (memory efficient)
- Only fetch what's needed
- Stop early on date filters

### 4. **Database Indexes**
```sql
CREATE INDEX idx_pr_author ON pull_requests(author);
CREATE INDEX idx_pr_created_at ON pull_requests(created_at);
CREATE INDEX idx_pr_author_created ON pull_requests(author, created_at);
```
**Result:** Fast queries for metrics computation

### 5. **WAL Mode**
```typescript
db.pragma('journal_mode = WAL');
```
**Benefits:**
- Better read concurrency
- Faster writes
- Crash-safe

---

## Testing Strategy

### 1. **Unit Tests**
- Domain metrics (pure functions)
- Query schema validation
- Config loading

### 2. **Integration Tests**
- Repository operations (in-memory SQLite)
- Migration system
- Config precedence

### 3. **Mock External Dependencies**
- Mock Octokit for GitHubClient tests
- Use in-memory DB for storage tests
- Mock fs for config tests

### 4. **Coverage Requirements**
- Lines: 40%
- Functions: 70%
- Branches: 90%
- Statements: 40%

---

## Security Considerations

### 1. **Token Management**
- Never commit .env
- Token loaded from environment
- Validated as required (min 1 char)

### 2. **SQL Injection Prevention**
- Always use prepared statements
- Never string concatenation
- Parameterized queries

```typescript
// ✅ SAFE
db.prepare('SELECT * FROM prs WHERE author = ?').get(author);

// ❌ NEVER DO THIS
db.prepare(`SELECT * FROM prs WHERE author = '${author}'`);
```

### 3. **Input Validation**
- All external input validated with Zod
- CLI options validated
- Date parsing with error handling

---

## Scalability Considerations

### Current Limits
- **GitHub API:** 5000 requests/hour
- **SQLite:** Millions of rows (fine for metrics)
- **Sync time:** ~1-2 minutes per 100 PRs

### For Large Organizations (500+ repos, 10,000+ PRs)

**Strategies:**
1. **Batch by time:** Sync one day at a time
2. **Parallel sync:** Multiple repos in parallel (with concurrency limit)
3. **Incremental sync:** Only new PRs since last sync
4. **Background jobs:** Cron for periodic sync

### When to Scale Beyond SQLite

**Stay with SQLite if:**
- < 1M PRs total
- Single-user CLI tool
- Local analysis

**Consider Postgres if:**
- Multi-user web app
- Millions of PRs
- Complex concurrent queries
- Distributed setup

---

## Future Architecture Enhancements

### 1. **Application Service Layer** (task-011)
```typescript
class MetricsService {
  async getEngineerMetrics(author, dateRange) {
    // Load PRs from DB
    // Compute metrics
    // Return results
  }
}
```

### 2. **Report Generation** (task-006)
```typescript
class ReportGenerator {
  generateMarkdown(metrics): string
  generateJSON(metrics): object
  generateCSV(metrics): string
}
```

### 3. **Caching Layer**
- In-memory cache for frequently accessed data
- TTL-based invalidation
- Reduce DB queries

### 4. **Event System**
- Emit events during sync (progress, error, complete)
- Pluggable listeners
- Better observability

---

## Technology Stack Rationale

### **TypeScript**
- Type safety reduces bugs
- Better IDE support
- Self-documenting code

### **Node.js**
- Large ecosystem
- Good GitHub API libraries
- Fast for I/O-bound tasks

### **Zod**
- Runtime + compile-time validation
- Great TypeScript integration
- Clear error messages

### **SQLite (better-sqlite3)**
- Simple deployment (no server)
- Synchronous API (simpler)
- Fast for our use case
- Easy backup

### **Octokit**
- Official GitHub client
- Type definitions
- Well-maintained

### **Commander.js**
- Simple CLI API
- Good TypeScript support
- Widely used

---

## Quality Standards

### **Every commit must pass:**
```bash
pnpm check   # typecheck + lint + format
pnpm test    # all tests
```

### **Code standards:**
- ✅ No `any` type (use specific or `unknown`)
- ✅ Zod for external data
- ✅ pnpm for package management
- ✅ Strict TypeScript mode
- ✅ ESLint with TypeScript rules
- ✅ Prettier formatting

---

## Summary

**The architecture provides:**
- 🎯 **Clear separation** of concerns
- 🛡️ **Type safety** at every boundary
- ⚡ **Performance** with smart filtering/caching
- 🔄 **Resilience** with retry logic and error isolation
- 🧪 **Testability** with dependency injection
- 📊 **Observability** with progress tracking
- 🚀 **Scalability** for growing organizations

**Core principle:** Make invalid states unrepresentable through types, and validate everything external with Zod.
