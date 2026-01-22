---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, performance, typescript]
dependencies: []
---

# Performance: Zod Schemas Recreated on Every Method Call

## Problem Statement

Zod schemas are defined inside methods and recreated on every call. Schema compilation has overhead that should be amortized.

**Why it matters:** Unnecessary CPU cycles for schema compilation on hot paths.

## Findings

**Location:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

Line 114:
```typescript
getSyncedDays(...): string[] {
  const SyncDateSchema = z.object({ sync_date: z.string() }); // Recreated each call
```

Line 141:
```typescript
getAllSyncedDays(...): string[] {
  const SyncDateSchema = z.object({ sync_date: z.string() }); // Duplicate + recreated
```

Line 266:
```typescript
getSyncSummary(...): Array<...> {
  const SummarySchema = z.object({...}); // Recreated each call
```

**Agent:** kieran-typescript-reviewer, performance-oracle

## Proposed Solutions

### Option A: Move to Class-Level Constants (Recommended)

```typescript
export class DailySyncMetadataRepository {
  private static readonly SyncDateSchema = z.object({ sync_date: z.string() });
  private static readonly SummarySchema = z.object({...});
  private static readonly CoverageSchema = z.object({...});

  getSyncedDays(...): string[] {
    // Use DailySyncMetadataRepository.SyncDateSchema
  }
}
```

**Pros:** Schema compiled once, reused
**Cons:** None
**Effort:** Low (15 minutes)
**Risk:** None

### Option B: Module-Level Constants

Define schemas at module level outside the class.

**Pros:** Even simpler
**Cons:** Less encapsulated
**Effort:** Low
**Risk:** None

## Recommended Action

Option A - Class-level static constants

## Technical Details

**File to Modify:** `src/infrastructure/storage/repositories/DailySyncMetadataRepository.ts`

**Performance Impact:** ~5-10 microseconds per call saved

## Acceptance Criteria

- [ ] All Zod schemas defined as class-level constants
- [ ] No duplicate schema definitions
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Schema recreation overhead |

## Resources

- PR: feat/incremental-per-day-sync
