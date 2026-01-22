---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, patterns, consistency]
dependencies: []
---

# Missing Export: DailySyncMetadataRepository Not in Index

## Problem Statement

`DailySyncMetadataRepository` is not exported from `repositories/index.ts`, causing inconsistent import patterns throughout the codebase.

**Why it matters:** Inconsistent imports reduce discoverability and break conventions.

## Findings

**Location:** `src/infrastructure/storage/repositories/index.ts`

Currently exports:
```typescript
export * from './PRRepository';
export * from './ReviewRepository';
export * from './CommentRepository';
export * from './SyncMetadataRepository';
export * from './CommitRepository';
export * from './CommitFileRepository';
export * from './RepositoryMetadataRepository';
// Missing: DailySyncMetadataRepository
```

**Current import pattern in SyncService.ts:**
```typescript
import { DailySyncMetadataRepository } from '../../infrastructure/storage/repositories/DailySyncMetadataRepository';
// Should be:
import { DailySyncMetadataRepository } from '../../infrastructure/storage/repositories';
```

**Agent:** pattern-recognition-specialist

## Proposed Solutions

### Option A: Add Export (Recommended)

Add to `src/infrastructure/storage/repositories/index.ts`:
```typescript
export * from './DailySyncMetadataRepository';
```

**Pros:** Consistent with other repositories
**Cons:** None
**Effort:** Low (1 minute)
**Risk:** None

## Recommended Action

Option A - Add export to index

## Technical Details

**File to Modify:** `src/infrastructure/storage/repositories/index.ts`

## Acceptance Criteria

- [ ] DailySyncMetadataRepository exported from index.ts
- [ ] Update imports in SyncService.ts to use index
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Missing export breaks pattern |

## Resources

- PR: feat/incremental-per-day-sync
