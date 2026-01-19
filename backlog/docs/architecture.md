# Engineering Metrics Platform - Architecture

**Last Updated:** 2025-10-03  
**Status:** Planning Phase

---

## Overview

This document defines the architecture for the Engineering Metrics Platform, a tool for monitoring engineer performance through GitHub data (and future Linear integration). The architecture is designed for **presentation layer flexibility**, allowing seamless transitions between CLI → TUI → Web UI without requiring rewrites.

---

## Core Principles

1. **Separation of Concerns** - Business logic is independent of presentation
2. **Presentation Agnostic** - Support CLI, TUI, and Web without code duplication
3. **Testability** - All layers can be tested in isolation
4. **Extensibility** - Easy to add new data sources (Linear) and metrics
5. **Smart Caching** - Efficient data synchronization with incremental updates

---

## Tech Stack

### Core
- **TypeScript + Node.js** - Type safety, cross-platform, excellent ecosystem
- **SQLite (better-sqlite3)** - Local persistence, SQL queries, lightweight

### Data Fetching
- **Octokit (@octokit/rest)** - Official GitHub API client
- **@linear/sdk** - Future: Linear integration

### Presentation Layers
- **Current: CLI**
  - **Commander.js** - Command parsing
  - **chalk** - Colored output
  - **ora** - Progress indicators
  
- **Future: TUI**
  - **Ink** - React for terminals (recommended)
  - Or **Blessed** - Traditional TUI toolkit

- **Future: Web**
  - **React** - UI framework
  - **Recharts** - Data visualization

### Development
- **Vitest** - Testing framework
- **ESLint + Prettier** - Code quality

---

## Layered Architecture

We follow **Clean/Hexagonal Architecture** principles:

```
┌─────────────────────────────────────────────────────────┐
│         PRESENTATION LAYER (Swappable!)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   CLI    │  │   TUI    │  │   Web    │             │
│  │Commander │  │   Ink    │  │  React   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│         APPLICATION LAYER (Reusable!)                   │
│  ┌─────────────────────────────────────────────┐       │
│  │  Services (Orchestration)                   │       │
│  │  • SyncService                              │       │
│  │  • MetricsService                           │       │
│  │  • ReportService                            │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│         DOMAIN LAYER (Business Logic)                   │
│  ┌─────────────────────────────────────────────┐       │
│  │  • Metrics computation                      │       │
│  │  • Domain models (Engineer, PR, Review)     │       │
│  │  • Business rules                           │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│         INFRASTRUCTURE LAYER (External Systems)         │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐        │
│  │ GitHub API   │  │  SQLite   │  │  Config  │        │
│  │  + Sync      │  │  Storage  │  │ Manager  │        │
│  └──────────────┘  └───────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Presentation Layer
- **Responsibility**: User interaction, input parsing, output formatting
- **Rule**: THIN layer, no business logic
- **Examples**: 
  - CLI: Parse args, display formatted output
  - TUI: Render components, handle keyboard input
  - Web: Serve API endpoints, render React components

#### 2. Application Layer (Services)
- **Responsibility**: Use case orchestration, coordinate between domain and infrastructure
- **Rule**: Presentation-agnostic, returns plain data objects
- **Examples**:
  - `SyncService.syncOrganization(org, dateRange, force)`
  - `MetricsService.getEngineerMetrics(engineer, dateRange)`
  - `ReportService.generateReport(dateRange, engineers)`

#### 3. Domain Layer
- **Responsibility**: Business logic, calculations, domain models
- **Rule**: Pure business logic, no external dependencies
- **Examples**:
  - Calculate lines of code per engineer
  - Aggregate review counts
  - Define what constitutes a "contribution"

#### 4. Infrastructure Layer
- **Responsibility**: External system integration (APIs, databases, file system)
- **Rule**: Implement interfaces defined by domain/application layer
- **Examples**:
  - Fetch PRs from GitHub API
  - Store/retrieve data from SQLite
  - Load configuration files

---

## Folder Structure

```
src/
  ├── presentation/           # Layer 1: UI/Interaction
  │   ├── cli/               # Commander.js CLI (current)
  │   │   ├── index.ts       # CLI entry point
  │   │   ├── commands/      # Command implementations
  │   │   │   ├── sync.ts
  │   │   │   └── report.ts
  │   │   └── utils/         # CLI-specific helpers
  │   │
  │   ├── tui/               # Ink TUI (future)
  │   │   ├── index.ts
  │   │   ├── screens/
  │   │   └── components/
  │   │
  │   └── formatters/        # Output formatting (reusable)
  │       ├── markdown.ts    # Markdown report formatter
  │       ├── console.ts     # Pretty console output
  │       └── json.ts        # JSON export for APIs
  │
  ├── app/                   # Layer 2: Application Services
  │   ├── services/          # Use case orchestration
  │   │   ├── SyncService.ts
  │   │   ├── MetricsService.ts
  │   │   └── ReportService.ts
  │   │
  │   └── types/             # DTOs, interfaces
  │       ├── dtos.ts
  │       └── interfaces.ts
  │
  ├── domain/                # Layer 3: Business Logic
  │   ├── metrics/           # Metrics computation
  │   │   ├── engineer-metrics.ts
  │   │   ├── team-metrics.ts
  │   │   └── aggregations.ts
  │   │
  │   └── models/            # Domain models
  │       ├── Engineer.ts
  │       ├── PullRequest.ts
  │       ├── Review.ts
  │       └── MetricsData.ts
  │
  └── infrastructure/        # Layer 4: External Systems
      ├── github/            # GitHub integration
      │   ├── client.ts      # Octokit wrapper
      │   ├── sync.ts        # Data synchronization
      │   └── types.ts       # GitHub-specific types
      │
      ├── storage/           # Database layer
      │   ├── database.ts    # SQLite initialization
      │   ├── schemas.ts     # Table schemas
      │   ├── repositories/  # Data access
      │   │   ├── PRRepository.ts
      │   │   ├── ReviewRepository.ts
      │   │   └── SyncMetadataRepository.ts
      │   └── migrations/    # Schema migrations
      │
      └── config/            # Configuration
          ├── config.ts      # Config loader
          └── schema.ts      # Config validation
```

---

## Data Flow Examples

### Example 1: Sync Command

**User Input:** `metrics sync --org mycompany --from 2025-09-01 --to 2025-09-30`

```typescript
// 1. PRESENTATION (CLI)
cli.command('sync')
  .action(async (options) => {
    // Parse arguments
    const { org, from, to, force } = options;
    
    // Delegate to service layer
    const result = await syncService.syncOrganization({
      organization: org,
      dateRange: { start: from, end: to },
      force: force
    });
    
    // Format output
    console.log(consoleFormatter.formatSyncResult(result));
  });

// 2. APPLICATION (Service)
class SyncService {
  async syncOrganization(request: SyncRequest): Promise<SyncResult> {
    // Check if sync needed (unless forced)
    if (!request.force) {
      const lastSync = await this.syncMetadataRepo.getLastSync(request.organization);
      if (this.isSyncCurrent(lastSync, request.dateRange)) {
        return { status: 'cached', itemsSynced: 0 };
      }
    }
    
    // Orchestrate sync
    const pullRequests = await this.githubSync.fetchPullRequests(request);
    const reviews = await this.githubSync.fetchReviews(pullRequests);
    const comments = await this.githubSync.fetchComments(pullRequests);
    
    // Store in database
    await this.prRepo.saveBatch(pullRequests);
    await this.reviewRepo.saveBatch(reviews);
    await this.commentRepo.saveBatch(comments);
    
    // Update sync metadata
    await this.syncMetadataRepo.updateLastSync(request.organization, new Date());
    
    return { 
      status: 'success', 
      itemsSynced: pullRequests.length + reviews.length + comments.length 
    };
  }
}

// 3. INFRASTRUCTURE (GitHub Sync)
class GitHubSync {
  async fetchPullRequests(request: SyncRequest): Promise<PullRequest[]> {
    // Use Octokit client with rate limiting, pagination, etc.
    const prs = await this.client.fetchAllPRs(request);
    return prs.map(pr => this.mapToDomainModel(pr));
  }
}

// 4. INFRASTRUCTURE (Storage)
class PRRepository {
  async saveBatch(prs: PullRequest[]): Promise<void> {
    // Save to SQLite with proper transactions
    this.db.transaction(() => {
      for (const pr of prs) {
        this.insertOrUpdate(pr);
      }
    })();
  }
}
```

### Example 2: Generate Report

**User Input:** `metrics report --from 2025-09-01 --to 2025-09-30`

```typescript
// 1. PRESENTATION (CLI)
cli.command('report')
  .action(async (options) => {
    const reportData = await reportService.generateReport({
      dateRange: { start: options.from, end: options.to }
    });
    
    const markdown = markdownFormatter.format(reportData);
    console.log(markdown);
  });

// 2. APPLICATION (Service)
class ReportService {
  async generateReport(request: ReportRequest): Promise<ReportData> {
    // Get data from repositories
    const engineers = await this.prRepo.getUniqueAuthors(request.dateRange);
    
    // Compute metrics for each engineer
    const metricsPromises = engineers.map(engineer => 
      this.metricsService.getEngineerMetrics(engineer, request.dateRange)
    );
    const allMetrics = await Promise.all(metricsPromises);
    
    // Return plain data object
    return {
      dateRange: request.dateRange,
      engineers: allMetrics,
      summary: this.computeSummary(allMetrics)
    };
  }
}

// 3. DOMAIN (Metrics)
class EngineerMetrics {
  compute(prs: PullRequest[], reviews: Review[], comments: Comment[]): Metrics {
    return {
      prsCreated: prs.length,
      reviewsGiven: reviews.length,
      linesAdded: prs.reduce((sum, pr) => sum + pr.additions, 0),
      linesDeleted: prs.reduce((sum, pr) => sum + pr.deletions, 0),
      commentsCreated: comments.length
    };
  }
}

// 4. PRESENTATION (Formatter)
class MarkdownFormatter {
  format(data: ReportData): string {
    // Pure formatting, no business logic
    return `# Engineering Metrics Report
    
## Summary
${this.formatSummary(data.summary)}

## Individual Metrics
${this.formatEngineerTable(data.engineers)}
    `;
  }
}
```

---

## Benefits of This Architecture

### ✅ Presentation Layer Independence
- **Switch from CLI to TUI**: Create `src/presentation/tui/`, reuse all services
- **Add Web UI**: Same services become API endpoints
- **Support multiple UIs**: Run CLI and Web simultaneously with shared backend

### ✅ Testability
```typescript
// Test services without any UI
describe('MetricsService', () => {
  it('computes PR count correctly', async () => {
    const service = new MetricsService(mockRepo);
    const metrics = await service.getEngineerMetrics('john', dateRange);
    expect(metrics.prsCreated).toBe(5);
  });
});
```

### ✅ Maintainability
- Bug fixes in domain/services benefit all presentation layers
- Clear boundaries prevent coupling
- Easy to onboard new developers (each layer has single responsibility)

### ✅ Extensibility
```typescript
// Adding Linear integration:
// 1. Create infrastructure/linear/
// 2. Add LinearSyncService to application layer
// 3. Update MetricsService to include Linear data
// 4. No changes needed to presentation layer!
```

---

## Migration Path: CLI → TUI → Web

### Phase 1: CLI (Current)
- Implement all layers with CLI as presentation
- Focus on solid business logic in services/domain
- Test services independently

### Phase 2: Add TUI (Future)
```typescript
// Create src/presentation/tui/
import { reportService } from '../../app/services/ReportService';

const ReportScreen = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    reportService.generateReport({ dateRange })  // SAME SERVICE!
      .then(setData);
  }, []);
  
  return <MetricsTable data={data} />;  // Different presentation
};
```

**Effort Required**: ~2-3 days (just UI components, reuse everything else)

### Phase 3: Add Web UI (Future)
```typescript
// Backend API
app.get('/api/reports', async (req, res) => {
  const data = await reportService.generateReport({  // SAME SERVICE!
    dateRange: parseDateRange(req.query)
  });
  res.json(data);
});

// Frontend
function Dashboard() {
  const { data } = useQuery('/api/reports');
  return <RechartsGraph data={data} />;
}
```

**Effort Required**: ~1 week (API layer + React frontend)

---

## Key Metrics to Track

### GitHub Metrics (Phase 1)
- Pull requests created
- Pull requests reviewed
- Lines of code added
- Lines of code deleted  
- Comments created
- PR merge time (average)
- Review turnaround time

### Linear Metrics (Phase 2 - Future)
- Issues completed
- Issues created
- Projects participated in
- Cycle time per issue
- Project updates posted

---

## Smart Caching Strategy

### Sync Metadata Table
```sql
CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY,
  resource_type TEXT NOT NULL,  -- 'pull_requests', 'reviews', 'comments'
  organization TEXT NOT NULL,
  last_sync_at DATETIME NOT NULL,
  date_range_start DATE,
  date_range_end DATE
);
```

### Caching Logic
1. Before sync, check `sync_metadata` for last sync time
2. If data exists for requested range and `--force` not used → skip sync
3. If partial overlap → only fetch missing data (incremental sync)
4. After successful sync → update `sync_metadata`

### Benefits
- Avoid hitting GitHub rate limits
- Fast repeated report generation
- Incremental updates (only fetch new data)

---

## Configuration

### Environment Variables
```bash
GITHUB_TOKEN=ghp_xxxxx          # Required
GITHUB_ORG=mycompany            # Required
DATABASE_PATH=./data/metrics.db  # Optional, default: ./metrics.db
LOG_LEVEL=info                   # Optional, default: info
```

### Config File (metrics.config.json)
```json
{
  "github": {
    "token": "${GITHUB_TOKEN}",
    "organization": "mycompany",
    "rateLimit": {
      "maxRetries": 3,
      "backoffMs": 1000
    }
  },
  "database": {
    "path": "./data/metrics.db"
  },
  "reports": {
    "defaultDateRange": "last-30-days",
    "outputDirectory": "./reports"
  }
}
```

---

## Development Guidelines

### Adding a New Metric

1. **Domain Layer** - Implement computation logic
```typescript
// domain/metrics/engineer-metrics.ts
export function computeAvgPRSize(prs: PullRequest[]): number {
  const totalLines = prs.reduce((sum, pr) => 
    sum + pr.additions + pr.deletions, 0
  );
  return totalLines / prs.length;
}
```

2. **Application Layer** - Expose via service
```typescript
// app/services/MetricsService.ts
async getEngineerMetrics(engineer: string, dateRange: DateRange) {
  const prs = await this.prRepo.findByAuthor(engineer, dateRange);
  return {
    // ... existing metrics
    avgPRSize: computeAvgPRSize(prs)  // NEW!
  };
}
```

3. **Presentation Layer** - Format in report
```typescript
// presentation/formatters/markdown.ts
formatEngineerMetrics(metrics: EngineerMetrics): string {
  return `
| Metric | Value |
|--------|-------|
| PRs Created | ${metrics.prsCreated} |
| Avg PR Size | ${metrics.avgPRSize} |  // NEW!
  `;
}
```

**No changes needed to infrastructure, storage, or sync!**

### Adding a New Data Source (e.g., Linear)

1. **Infrastructure** - Create Linear client
```typescript
// infrastructure/linear/client.ts
// infrastructure/linear/sync.ts
```

2. **Storage** - Add Linear tables
```typescript
// infrastructure/storage/schemas.ts
CREATE TABLE linear_issues (...);
```

3. **Application** - Add Linear sync service
```typescript
// app/services/LinearSyncService.ts
```

4. **Domain** - Extend metrics to include Linear data
```typescript
// domain/metrics/engineer-metrics.ts
export function computeCombinedMetrics(
  githubMetrics: GitHubMetrics,
  linearMetrics: LinearMetrics
): CombinedMetrics { ... }
```

5. **Presentation** - Update formatters
```typescript
// presentation/formatters/markdown.ts
// Add Linear metrics to reports
```

---

## Testing Strategy

### Unit Tests
- Domain layer: Pure functions, easy to test
- Services: Mock repositories
- Formatters: Input → Output verification

### Integration Tests
- GitHub sync with mock API responses
- Database operations with in-memory SQLite
- End-to-end command execution

### Test Coverage Goals
- Domain layer: 90%+
- Application layer: 85%+
- Infrastructure layer: 70%+
- Presentation layer: 60%+ (mostly integration tests)

---

## Future Enhancements

### Short Term
- [ ] Incremental sync (fetch only new data)
- [ ] Concurrent organization support
- [ ] Report caching
- [ ] Export to CSV/JSON

### Medium Term
- [ ] TUI with live dashboard
- [ ] Linear integration
- [ ] Team comparisons
- [ ] Trend analysis over time

### Long Term
- [ ] Web UI with charts
- [ ] Real-time metrics streaming
- [ ] Slack/Discord notifications
- [ ] Custom metric definitions
- [ ] Multi-organization aggregation

---

## Related Documents

- [Task Breakdown](../tasks/) - Implementation tasks
- [API Documentation](./api.md) - Service interfaces (to be created)
- [Database Schema](./schema.md) - Storage structure (to be created)

---

**Document Owner**: AI Assistant  
**Last Review**: 2025-10-03  
**Next Review**: After Phase 1 completion
