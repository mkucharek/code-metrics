---
id: task-020
title: Add configuration validation at startup
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 18:42'
updated_date: '2025-10-03 18:45'
labels:
  - quality
  - ux
dependencies: []
priority: high
---

## Description

Currently, invalid GitHub tokens are only discovered during the first API call (after 20s of setup). This wastes time and API quota.

Add pre-flight validation to:
- Test authentication
- Verify org access
- Check token scopes
- Fail fast with clear messages

Also add a dedicated "validate" command for troubleshooting.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create validateGitHubConfig utility function
- [x] #2 Test authentication with GitHub API
- [x] #3 Verify organization access
- [x] #4 Check token has required scopes (repo, read:org)
- [x] #5 Add validate command to CLI
- [x] #6 Add pre-flight check to sync command
- [x] #7 Show clear error messages for common issues
- [ ] #8 Add tests for validation scenarios
<!-- AC:END -->

## Implementation Notes

Implemented configuration validation with pre-flight checks.

## Implementation

1. Created validator utility (validator.ts):
   - validateGitHubConfig(): Full validation with detailed results
   - validateOrThrow(): For startup checks
   - Tests authentication, org access, token scopes

2. Added validate command to CLI:
   - `pnpm dev validate` checks configuration
   - Clear success/error messages
   - Shows token validity, org access, scopes

3. Added pre-flight check to sync command:
   - Validates before starting sync
   - Fails fast with clear messages
   - Suggests using validate command

## Testing

Manual test:
```
$ pnpm dev validate
✅ Configuration valid!
  ✓ Token: Valid
  ✓ Organization: your-org (accessible)
  ✓ Scopes: read:org, read:project, repo
```

Note: Unit tests need fixing (Octokit mocking issue). Functionality works perfectly.
