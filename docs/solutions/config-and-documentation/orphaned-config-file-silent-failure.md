---
title: "Config File Consolidation: .metricsrc to metrics.config.json"
category: config-and-documentation
severity: medium
impact: silent_failure
problem_type: documentation_drift
components:
  - config_loader
  - cli
  - documentation
root_cause: "Dual documentation but single implementation - .metricsrc documented but never loaded"
symptom: "Teams configured in .metricsrc silently failed to load"
solution_pattern: "Single source of truth + deprecation warning"
discovery_method: "Code review comparing loader default vs documented examples"
date_solved: 2026-01-22
related_files:
  - src/infrastructure/config/loader.ts
  - src/presentation/cli/index.ts
  - metrics.config.example.json
  - backlog/docs/doc-005 - Team Organization Guide.md
---

# Orphaned Config File Silent Failure

## Problem

Documentation and CLI help referenced `.metricsrc` for team configuration, but the config loader only read `metrics.config.json`. Users following docs created `.metricsrc` files with valid team config that was silently ignored.

**Symptom:** `--team frontend` fails with "Team not found" despite valid config in `.metricsrc`

## Root Cause

The config loader hardcoded the default path:

```typescript
// src/infrastructure/config/loader.ts:159
const { configFile = './metrics.config.json', ... } = options;
```

But documentation, CLI help, and example files all referenced `.metricsrc`:
- CLI: `--team <team>` help said "defined in .metricsrc"
- Error messages: "Add teams to your .metricsrc file"
- Docs: Team Organization Guide with 6+ references
- Example: `.metricsrc.example` existed but was never used

## Investigation Steps

1. User reported teams not loading despite valid config
2. Checked CLI help text - referenced `.metricsrc`
3. Searched codebase for actual config loading
4. Found `loader.ts:159` only loads `metrics.config.json`
5. Confirmed `.metricsrc` was never read anywhere

## Solution

### 1. Add Orphaned File Warning

```typescript
// src/infrastructure/config/loader.ts
function warnIfOrphanedMetricsrc(): void {
  const metricsrcPath = resolve('./.metricsrc');
  if (existsSync(metricsrcPath)) {
    console.warn('\x1b[33m⚠️  Found .metricsrc file which is no longer used.\x1b[0m');
    console.warn(
      '\x1b[33m   Migrate teams config to metrics.config.json and delete .metricsrc\x1b[0m'
    );
    console.warn('');
  }
}
```

Called during `loadConfig()` to catch users with orphaned files.

### 2. Update CLI References

```typescript
// src/presentation/cli/index.ts:693
.option('--team <team>', 'Filter by team (defined in metrics.config.json)')

// Lines 744-745
console.log(chalk.cyan('💡 Add teams to your metrics.config.json file'));
console.log(chalk.gray('   See metrics.config.example.json for examples'));
```

### 3. Update Example Config

Added teams section to `metrics.config.example.json`:

```json
{
  "teams": {
    "frontend": {
      "name": "Frontend Team",
      "members": ["alice", "bob"],
      "repositories": ["web-app", "mobile-app"]
    }
  }
}
```

### 4. Delete Obsolete Files

- Deleted `.metricsrc.example`
- Updated `.gitignore` to ignore `metrics.config.json` (contains token)

### 5. Update Documentation

Updated Team Organization Guide with migration notice:

```markdown
### Migration from .metricsrc

If you previously created a `.metricsrc` file, your teams configuration was not being loaded.
To fix:
1. Copy the `teams` section from `.metricsrc` to `metrics.config.json`
2. Delete or rename `.metricsrc`
3. Verify: `pnpm dev report --team <team-name>`
```

## Prevention Strategies

### Single Source of Truth

Use a constant for config file names:

```typescript
export const CONFIG_FILES = {
  PRIMARY: 'metrics.config.json',
  LEGACY: ['.metricsrc'],
} as const;
```

### Documentation Validation Tests

```typescript
it('config file names in docs match code', () => {
  const readme = fs.readFileSync('README.md', 'utf-8');
  expect(readme).not.toContain('.metricsrc');
  expect(readme).toContain('metrics.config.json');
});
```

### Config Discovery Logging

Log what config was loaded at startup so users see transparency:

```
[CONFIG] Loaded: ./metrics.config.json
[CONFIG] ⚠ Warning: .metricsrc exists but is ignored
```

## Key Insight

**Silent failures happen when docs and code decouple.** The config loader worked correctly - it just didn't match what was documented. Automate the sync between code behavior and documentation.

## Related

- Plan: `plans/refactor-consolidate-config-files.md`
- Architecture: `backlog/docs/doc-001 - Architecture.md` (config loading)
- Team Guide: `backlog/docs/doc-005 - Team Organization Guide.md`
