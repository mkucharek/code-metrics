# refactor: Consolidate config files to metrics.config.json

Remove `.metricsrc` references and use only `metrics.config.json` for all configuration. The `.metricsrc` file was documented but never actually loaded by the config system.

## Problem

Documentation and CLI help reference `.metricsrc` for team configuration, but `src/infrastructure/config/loader.ts:159` only loads `metrics.config.json`. This causes user confusion - teams configured in `.metricsrc` silently don't work.

## Acceptance Criteria

- [x] CLI help text references `metrics.config.json` instead of `.metricsrc`
- [x] Error messages point to correct config file
- [x] `metrics.config.example.json` includes complete `teams` section
- [x] `.metricsrc.example` deleted
- [x] Documentation updated (Team Organization Guide)
- [x] Warning displayed if orphaned `.metricsrc` file detected
- [x] `.gitignore` updated (remove `.metricsrc`, ensure `metrics.config.json` handled)
- [x] `pnpm run verify` passes

## Files to Change

### 1. CLI Help & Error Messages
**`src/presentation/cli/index.ts`**
- Line 693: `--team` option help text
- Lines 744-745: Team not found error message

### 2. Config Loader - Add Warning
**`src/infrastructure/config/loader.ts`**
- Add check for orphaned `.metricsrc` file
- Display warning to migrate

### 3. Example Files
**`metrics.config.example.json`** - Add teams section:
```json
{
  "teams": {
    "frontend": {
      "name": "Frontend Team",
      "description": "Web developers",
      "members": ["alice", "bob"],
      "repositories": ["web-app", "mobile-app"]
    }
  }
}
```

**`.metricsrc.example`** - Delete file

### 4. Gitignore
**`.gitignore`**
- Remove `.metricsrc` reference
- Add `metrics.config.json` (contains token)

### 5. Documentation
**`backlog/docs/doc-005 - Team Organization Guide.md`**
- Lines 21, 59, 136, 147, 151, 208: Change `.metricsrc` to `metrics.config.json`
- Add migration notice for existing users

### 6. Historical Tasks (Optional)
**`backlog/tasks/task-057`, `task-053`** - Leave as historical record or add note

## Migration Notice (for docs)

```markdown
## Migration from .metricsrc

If you previously created a `.metricsrc` file, your teams configuration was not being loaded.
To fix:
1. Copy the `teams` section from `.metricsrc` to `metrics.config.json`
2. Delete or rename `.metricsrc`
3. Verify: `pnpm dev report --team <team-name>`
```

## References

- Config loader: `src/infrastructure/config/loader.ts:159`
- Config schema: `src/infrastructure/config/schema.ts:131` (teams supported)
- Current .metricsrc refs: CLI (3), gitignore (2), docs (6+)
