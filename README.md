# Engineering Metrics Platform

A TypeScript-based tool for monitoring engineering performance through GitHub data (with future Linear integration).

## 📋 Overview

This platform tracks engineering metrics across your organization, providing insights into pull requests, code reviews, and overall team productivity. Built with a clean architecture to support multiple UIs (CLI → TUI → Web) without rewrites.

## 🎯 Key Features

- **GitHub Integration**: Fetch and analyze PRs, reviews, comments, and contributions
- **Smart Caching**: Intelligent data synchronization to avoid redundant API calls
- **Multiple Report Types**: Overview, engineer-specific, and team rankings
- **Bot Filtering**: Automatically hide bot users (dependabot, coderabbitai, etc.)
- **Flexible Date Ranges**: Days ago, ISO dates, or specific months/quarters
- **Data Validation**: Warns if trying to generate reports for un-synced dates
- **Multiple Formats**: Markdown (human-readable) and JSON (machine-readable)
- **Presentation Agnostic**: Business logic separated from UI for flexibility
- **Future Ready**: Architecture supports TUI and Web UI additions

## 🛠️ Tech Stack

### Core
- **TypeScript** - Type safety and excellent tooling
- **Node.js** - Cross-platform runtime
- **pnpm** - Fast, disk-efficient package manager

### Data & Storage
- **SQLite (better-sqlite3)** - Local persistence with SQL queries
- **Octokit (@octokit/rest)** - Official GitHub API client
- **Zod** - Runtime validation and type safety

### CLI
- **Commander.js** - Command-line argument parsing
- **chalk** - Colored terminal output
- **ora** - Elegant progress indicators

### Development
- **Vitest** - Fast unit testing framework
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Consistent code formatting
- **tsx** - TypeScript execution and hot reload

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (install with `npm install -g pnpm`)
- GitHub Personal Access Token with `repo` and `read:org` scopes

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables template
cp .env.example .env

# Edit .env with your GitHub token and organization
# Get your token from: https://github.com/settings/tokens
# Required scopes: repo, read:org, read:user
```

### Quick Start

```bash
# 1. Validate your configuration
pnpm dev validate

# 2. Sync last 30 days of data
pnpm dev sync --since 30

# 3. Check what data is available
pnpm dev check

# 4. Generate a report
pnpm dev report --since 30
```

### CLI Commands

#### Sync GitHub Data
```bash
# Sync all repositories (last 30 days)
pnpm dev sync

# Sync specific repository
pnpm dev sync --repo web-app --since 7

# Sync specific date range (e.g., September 2025)
pnpm dev sync --since 2025-09-01 --until 2025-09-30
```

#### Generate Reports
```bash
# Organization overview
pnpm dev report --since 30

# Team rankings
pnpm dev report --type rankings --since 30

# Individual engineer report
pnpm dev report --type engineer --engineer "Alice Smith" --since 30

# Hide bot users (default behavior)
pnpm dev report --since 30

# Include bots
pnpm dev report --since 30 --include-bots

# Exclude specific users
pnpm dev report --since 30 --exclude-users "bot1,bot2"

# Export to file
pnpm dev report --since 30 --output team-report.md

# Export as JSON
pnpm dev report --since 30 --format json --output metrics.json
```

#### Check Available Data
```bash
# See what data ranges are synced
pnpm dev check

# View database statistics
pnpm dev stats
```

### Common Use Cases

**Monthly Team Report:**
```bash
# Sync September 2025
pnpm dev sync --since 2025-09-01 --until 2025-09-30

# Generate report for September
pnpm dev report --since 2025-09-01 --until 2025-09-30 --output sept-2025.md
```

**Weekly Sprint Review:**
```bash
# Last 7 days (rolling window)
pnpm dev sync --since 7
pnpm dev report --type rankings --since 7
```

**Quarterly Executive Summary:**
```bash
# Q3 2025 (July-September)
pnpm dev sync --since 2025-07-01 --until 2025-09-30
pnpm dev report --since 2025-07-01 --until 2025-09-30 --output Q3-2025.md
```

### Development

```bash
# Run in development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Run all quality checks (runs automatically before commit)
pnpm check

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode for tests
pnpm test:watch

# Interactive test UI
pnpm test:ui
```

### Pre-commit Hooks

The project uses Husky to automatically run quality checks before each commit:
- ✅ Automatically formats code with Prettier
- ✅ Runs ESLint to catch errors
- ✅ Runs full type checking
- ✅ Runs all tests

**To bypass hooks** (not recommended): `git commit --no-verify`

## 📁 Project Structure

```
src/
├── presentation/           # Layer 1: UI/Interaction
│   ├── cli/               # Commander.js CLI (current)
│   ├── tui/               # Ink TUI (future)
│   └── formatters/        # Output formatting (reusable)
│
├── app/                   # Layer 2: Application Services
│   ├── services/          # Use case orchestration
│   └── types/             # DTOs, interfaces
│
├── domain/                # Layer 3: Business Logic
│   ├── metrics/           # Metrics computation
│   └── models/            # Domain models
│
└── infrastructure/        # Layer 4: External Systems
    ├── github/            # GitHub integration
    ├── storage/           # Database layer
    └── config/            # Configuration
```

## 🎨 Architecture Principles

1. **Separation of Concerns** - Business logic independent of presentation
2. **Presentation Agnostic** - Support CLI, TUI, Web without code duplication
3. **Testability** - All layers tested in isolation
4. **Extensibility** - Easy to add new data sources and metrics
5. **Type Safety** - Strict TypeScript, no `any` types

## 🔍 Quality Standards

This project enforces strict quality standards:

- ✅ **TypeScript Strict Mode** - `strict: true`, `noImplicitAny: true`
- ✅ **No `any` Types** - Use specific types or `unknown`
- ✅ **ESLint** - TypeScript rules with `no-explicit-any` enforced
- ✅ **Prettier** - Consistent code formatting
- ✅ **Zod Validation** - Runtime validation for external data
- ✅ **Test Coverage** - Minimum thresholds: 40% lines, 70% functions, 90% branches
- ✅ **Pre-commit Hooks** - Automatic quality checks on every commit

All code must pass `pnpm check` and tests before committing.

## 📊 Metrics Tracked

### GitHub Metrics (Current)
- Pull requests created
- Pull requests reviewed
- Lines of code added/deleted
- Comments created
- PR merge time (average)
- Review turnaround time

### Linear Metrics (Future)
- Issues completed/created
- Cycle time per issue
- Project participation

## 🗺️ Roadmap

### Phase 1: CLI (Current)
- [x] Project setup and architecture
- [ ] Metrics computation engine
- [ ] SQLite storage layer
- [ ] GitHub API client
- [ ] CLI interface
- [ ] Markdown report generator

### Phase 2: TUI (Future)
- [ ] Interactive terminal dashboard
- [ ] Real-time metric updates
- [ ] Keyboard navigation

### Phase 3: Web UI (Future)
- [ ] React-based web interface
- [ ] Data visualization with charts
- [ ] REST API backend

## 📄 License

ISC

## 🤝 Contributing

See architecture documentation in `backlog/docs/architecture.md` for detailed design decisions and contribution guidelines.
