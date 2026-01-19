---
id: task-021
title: Implement custom error types for better error handling
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 18:42'
updated_date: '2025-10-04 08:05'
labels:
  - quality
  - refactoring
dependencies: []
priority: high
---

## Description

Currently using generic Error class with string matching (fragile). Need domain-specific error types for type-safe error handling.

Error types needed:
- GitHubAuthenticationError
- GitHubResourceNotFoundError
- GitHubRateLimitError
- ValidationError
- DatabaseError
- ConfigurationError

Benefits:
- Type-safe error handling
- No fragile string matching
- Error codes for debugging
- Better user messages

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Create AppError base class with code and statusCode
- [x] #2 Define GitHub API error classes
- [x] #3 Define validation error classes
- [x] #4 Define database and config error classes
- [x] #5 Replace generic throw new Error throughout codebase
- [x] #6 Update GitHubClient to throw custom errors
- [x] #7 Update CLI error handling with instanceof checks
- [x] #8 Add tests for each error type
<!-- AC:END -->


## Implementation Notes

Implemented comprehensive custom error type system:

**Created Error Hierarchy:**
- AppError base class with code, statusCode, toJSON()
- GitHub errors: AuthenticationError, ResourceNotFoundError, RateLimitError, ApiError
- Validation, Database, Configuration, and Sync errors
- Utility functions: isAppError(), toAppError(), getUserMessage()

**Replaced Generic Errors:**
- GitHubClient: throws GitHubAuthenticationError, GitHubResourceNotFoundError, GitHubApiError
- Config loader: throws ConfigurationError with context
- Config validator: throws ConfigurationError
- Domain metrics: throws ValidationError for runtime checks

**Enhanced CLI Error Handling:**
- instanceof checks for all custom error types
- Colored, user-friendly error messages
- Context-specific help (e.g., token URL for auth errors)
- DEBUG mode for stack traces

**Added Tests:**
- 40 comprehensive tests for all error types
- Tests for error metadata, JSON serialization, utility functions
- All 124 tests passing ✅

**Updated Documentation:**
- Added Error Handling Standards section to AGENTS.md
- Complete examples and best practices
- Guidelines for creating new error types

Files modified:
- src/domain/errors/index.ts (error definitions)
- src/domain/errors/index.test.ts (40 tests)
- src/infrastructure/config/loader.ts
- src/infrastructure/config/validator.ts
- src/infrastructure/github/GitHubClient.ts
- src/domain/metrics/organization-metrics.ts
- src/presentation/cli/index.ts (enhanced error handling)
- AGENTS.md (error handling guidelines)
