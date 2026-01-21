# Web UI for Code Metrics

## Summary
Local web UI (Hono + React) for team metrics with dashboard, engineer deep-dive, and sync controls.

## Architecture
```
src/presentation/web/
├── server/              # Hono API
│   ├── index.ts        # Server entry, static serving
│   └── routes/         # API routes (metrics, data, sync)
└── client/             # Vite + React SPA
    └── src/
        ├── pages/      # Dashboard, EngineerDetail, Settings
        ├── components/ # Charts, tables, layout
        ├── hooks/      # useMetrics, useSync
        └── lib/        # API client
```

## API Endpoints (reuse existing ReportGenerator)
```
GET /api/health
GET /api/metrics/organization?since=&until=&team=
GET /api/metrics/engineer/:username?since=&until=
GET /api/metrics/repositories?since=&until=
GET /api/engineers
GET /api/repositories
GET /api/teams
GET /api/teams/:teamId
GET /api/config
GET /api/sync/status
POST /api/sync/start
GET /api/sync/progress/:jobId
DELETE /api/sync/cancel/:jobId
GET /api/sync/jobs
```

## Pages

### 1. Dashboard (/)
- Org overview cards (PRs, engineers, merge rate, avg PR size)
- Top contributors bar chart (Recharts)
- Team selector + date range picker
- Engineers table with links to detail pages

### 2. Engineer Detail (/engineer/:username)
- Summary stats cards (PRs, reviews, lines, merge rate)
- Contribution heatmap (CSS grid, GitHub-style)
- Weekly timeline chart
- PR size distribution pie
- Turnaround times (median, p75, p95)
- Collaboration partners (top reviewers, most reviewed)
- PR table with status tabs (all, open, merged, closed)

### 3. Settings (/settings)
- Organization info
- Sync status (coverage, synced ranges)
- Sync trigger form (days, repository filter)
- Progress indicator
- Recent sync jobs list

## Scripts (package.json)
```json
"dev:server": "tsx src/presentation/web/server/index.ts",
"dev:client": "cd src/presentation/web/client && pnpm dev",
"build:web": "cd src/presentation/web/client && pnpm build",
"serve": "tsx src/presentation/cli/index.ts serve"
```

## CLI Command
```bash
pnpm dev serve [--port 3000] [--no-open]
```

## Implementation Tasks

### Phase 1: Backend API
- [x] 1. Create Hono server skeleton (`src/presentation/web/server/index.ts`)
- [x] 2. Add metrics routes (org, engineer, repos)
- [x] 3. Add data routes (engineers list, repos list, teams, config)
- [x] 4. Add sync routes (status, start, progress, cancel, jobs)
- [x] 5. Error handling middleware

### Phase 2: React Setup
- [x] 6. Init Vite React project in `src/presentation/web/client/`
- [x] 7. Configure Vite proxy, Tailwind CSS, PostCSS
- [x] 8. Create layout components (Header, nav)
- [x] 9. Setup TanStack Query + API client

### Phase 3: Dashboard
- [x] 10. Dashboard page with date range picker
- [x] 11. Organization overview cards
- [x] 12. Top contributors chart (Recharts)
- [x] 13. Team selector (from config)
- [x] 14. Engineers table

### Phase 4: Engineer Detail
- [x] 15. Engineer detail page shell
- [x] 16. Contribution heatmap component
- [x] 17. Activity charts (weekly, PR size distribution)
- [x] 18. Turnaround times display
- [x] 19. Collaboration partners
- [x] 20. PR table with tabs

### Phase 5: Sync Controls
- [x] 21. Settings page with sync status
- [x] 22. Sync trigger form
- [x] 23. Progress polling + display
- [x] 24. Recent jobs list

### Phase 6: Integration
- [x] 25. Add `serve` command to CLI
- [x] 26. Production build setup
- [x] 27. Configure tsconfig/eslint/prettier exclusions

## Progress Tracking

| Phase | Status | Completed | Notes |
|-------|--------|-----------|-------|
| 1. Backend API | Complete | 2026-01-21 | Using Hono instead of Express |
| 2. React Setup | Complete | 2026-01-21 | Vite + TailwindCSS + TanStack Query |
| 3. Dashboard | Complete | 2026-01-21 | Recharts for visualizations |
| 4. Engineer Detail | Complete | 2026-01-21 | Heatmap, charts, PR table |
| 5. Sync Controls | Complete | 2026-01-21 | Status, trigger, progress |
| 6. Integration | Complete | 2026-01-21 | CLI serve command, build scripts |

## Files Created

### Server
- `src/presentation/web/server/index.ts` - Main server entry
- `src/presentation/web/server/routes/metrics.ts` - Metrics API routes
- `src/presentation/web/server/routes/data.ts` - Data API routes
- `src/presentation/web/server/routes/sync.ts` - Sync API routes
- `src/presentation/web/server/routes/index.ts` - Routes barrel export

### Client
- `src/presentation/web/client/package.json`
- `src/presentation/web/client/vite.config.ts`
- `src/presentation/web/client/tsconfig.json`
- `src/presentation/web/client/tailwind.config.js`
- `src/presentation/web/client/postcss.config.js`
- `src/presentation/web/client/index.html`
- `src/presentation/web/client/src/main.tsx`
- `src/presentation/web/client/src/App.tsx`
- `src/presentation/web/client/src/index.css`
- `src/presentation/web/client/src/lib/api.ts`
- `src/presentation/web/client/src/hooks/useMetrics.ts`
- `src/presentation/web/client/src/hooks/useSync.ts`
- `src/presentation/web/client/src/components/Layout.tsx`
- `src/presentation/web/client/src/components/DateRangePicker.tsx`
- `src/presentation/web/client/src/components/MetricCard.tsx`
- `src/presentation/web/client/src/components/ContributionHeatmap.tsx`
- `src/presentation/web/client/src/components/PRTable.tsx`
- `src/presentation/web/client/src/pages/Dashboard.tsx`
- `src/presentation/web/client/src/pages/EngineerDetail.tsx`
- `src/presentation/web/client/src/pages/Settings.tsx`

## Files Modified
- `src/presentation/cli/index.ts` - Added serve command
- `package.json` - Added dependencies and scripts
- `tsconfig.json` - Excluded client directory
- `.prettierignore` - Created to exclude client

## Usage

### Development
```bash
# Start API server (port 3000)
pnpm dev:server

# Start client dev server (port 5173, proxies API to 3000)
pnpm dev:client
```

### Production
```bash
# Build client and start server
pnpm build:web && pnpm serve

# Or via CLI
pnpm dev serve --port 3000
```

## Tech Stack
- **Backend**: Hono (fast, lightweight), Node.js
- **Frontend**: React 19, Vite 6, TailwindCSS 3
- **State**: TanStack Query v5
- **Charts**: Recharts
- **Routing**: React Router v7
