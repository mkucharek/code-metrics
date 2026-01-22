---
id: doc-005
title: Team Organization Guide
created: 2025-10-07
---

# Team Organization Guide

## Overview

The metrics platform supports organizing engineers into teams for team-level reporting and analysis. This enables:
- Team-specific metrics and reports
- Cross-team collaboration analysis
- Repository ownership tracking
- Multi-team engineer support

## Configuration

### Basic Setup

Create or edit `metrics.config.json` in your project root:

```json
{
  "github": {
    "token": "your-token",
    "organization": "your-org"
  },
  "teams": {
    "frontend": {
      "name": "Frontend Team",
      "description": "Web and mobile developers",
      "members": ["alice", "bob", "charlie"],
      "repositories": ["web-app", "mobile-app"]
    },
    "backend": {
      "name": "Backend Team",
      "description": "API developers",
      "members": ["dave", "eve"],
      "repositories": ["api-app-data", "accounts-backend"]
    }
  }
}
```

### Team Schema

Each team has the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Display name for the team |
| `description` | string | No | Optional description |
| `members` | string[] | Yes | GitHub usernames of team members |
| `repositories` | string[] | No | Repositories owned by this team |

### Example Configuration

See `metrics.config.example.json` for a complete example with multiple teams.

### Migration from .metricsrc

If you previously created a `.metricsrc` file, your teams configuration was not being loaded.
To fix:
1. Copy the `teams` section from `.metricsrc` to `metrics.config.json`
2. Delete or rename `.metricsrc`
3. Verify: `pnpm dev report --team <team-name>`

## Usage

### Team-Filtered Reports

Generate reports for a specific team:

```bash
# Organization report for frontend team
pnpm dev report --team frontend --since 30

# Engineer report for team member
pnpm dev report --team backend --engineer dave --since 2025-09-01

# Team report with specific date range
pnpm dev report --team platform --since 2025-09-01 --until 2025-09-30
```

### Team Filtering Behavior

When `--team` is specified:

1. **Engineers Filtered**: Only team members appear in the report
2. **Repositories Filtered**: Uses team's repositories (unless `--repo` is explicit)
3. **Team Context**: Report header shows team name and members

### Combining Filters

You can combine team filtering with other options:

```bash
# Team report for specific repositories
pnpm dev report --team frontend --repo web-app,mobile-app

# Team report excluding certain users
pnpm dev report --team backend --exclude-users your-bot

# Team report in CSV format
pnpm dev report --team platform --format csv --output platform-report.csv
```

## Multi-Team Engineers (Phase 2)

### Current Behavior

Engineers can be members of multiple teams in the configuration:

```json
{
  "teams": {
    "frontend": {
      "name": "Frontend Team",
      "members": ["alice", "bob"]
    },
    "mobile": {
      "name": "Mobile Team",
      "members": ["bob", "charlie"]  // bob is in both teams
    }
  }
}
```

When generating a report for a team, all members are included regardless of their other team memberships.

### Future Enhancements

Planned for Phase 2:
- Show which engineers work across multiple teams
- Cross-team collaboration metrics
- Team comparison reports
- Engineer allocation across teams

## Team Management

### Adding a New Team

1. Edit `metrics.config.json`
2. Add team definition under `teams`
3. Specify team name, members, and repositories
4. Save and test:

```bash
pnpm dev report --team new-team --since 7
```

### Updating Team Membership

Simply edit the `members` array in `metrics.config.json`. Changes take effect immediately.

### Removing a Team

Delete the team entry from the `teams` object in `metrics.config.json`.

## Best Practices

### Team Structure

**✅ Good:**
- Clear team boundaries
- 3-8 members per team
- Distinct repository ownership
- Descriptive team names

**❌ Avoid:**
- Overlapping repository ownership
- Single-person teams (unless intentional)
- Too many teams (< 10 is ideal)
- Vague team names

### Repository Assignment

Assign repositories to teams based on:
- Primary ownership
- Most frequent contributors
- On-call responsibility
- Domain knowledge

### Member Management

- Keep team membership up to date
- Include contractors and full-time equally
- Consider part-time/multi-team engineers
- Document team transitions

## Validation

The system validates team configuration:

**Checked:**
- ✅ Each team has a name
- ✅ Each team has at least one member
- ✅ Team IDs are unique

**Warnings:**
- ⚠️  Engineer in multiple teams (informational only)

**Not Validated:**
- Repository names (checked at runtime)
- GitHub usernames (checked at runtime)

## Troubleshooting

### Team Not Found

```
❌ Team not found: frontend
```

**Solution:** Check team ID in `metrics.config.json` matches the `--team` argument exactly (case-sensitive).

### No Data for Team

```
⚠️  Warning: No synced data found for requested date range
```

**Solution:** 
1. Check team members have activity in date range
2. Ensure team repositories are synced
3. Verify date range parameters

### Empty Report

If report shows no activity:
- Verify team members are spelled correctly (GitHub usernames)
- Check members actually have PRs in the date range
- Ensure repositories are correctly assigned

## Future Features (Roadmap)

### Phase 2: Enhanced Team Features
- Team comparison reports
- Cross-team collaboration metrics
- Team velocity tracking
- Engineer allocation analysis

### Phase 3: Advanced Features
- GitHub Teams API integration
- Automatic repository inference
- Team hierarchy support
- Custom team metrics

## Related Documentation

- [CLI User Guide](./doc-003%20-%20CLI%20User%20Guide.md)
- [Configuration Guide](../README.md#configuration)
- [Report Generation](./doc-003%20-%20CLI%20User%20Guide.md#report-command)
