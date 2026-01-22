---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, architecture, clean-architecture]
dependencies: []
---

# Architecture: Dependency Inversion Violation in SyncPlanService

## Problem Statement

`SyncPlanService` (application layer) imports directly from infrastructure layer, violating the Dependency Inversion Principle. The application layer should depend on abstractions (interfaces) in the domain layer.

**Why it matters:** Couples application logic to infrastructure implementation, making testing harder and reducing modularity.

## Findings

**Location:** `src/application/services/SyncPlanService.ts` lines 6-9

```typescript
import type {
  DailySyncMetadataRepository,
  DailyResourceType,
} from '../../infrastructure/storage/repositories/DailySyncMetadataRepository';
```

**Agent:** architecture-strategist

## Proposed Solutions

### Option A: Create Port Interface in Domain Layer (Recommended)

```typescript
// src/domain/ports/DailySyncPort.ts
export type DailyResourceType = 'pull_requests' | 'reviews' | 'comments' | 'commits';

export interface DailySyncPort {
  getSyncedDays(
    resourceType: DailyResourceType,
    organization: string,
    repository: string,
    startDate: string,
    endDate: string
  ): string[];
}
```

Then update SyncPlanService:
```typescript
import type { DailySyncPort, DailyResourceType } from '../../domain/ports/DailySyncPort';
```

**Pros:** Proper layer separation, easier testing
**Cons:** Additional interface file
**Effort:** Low
**Risk:** None

### Option B: Accept as Pragmatic Trade-off
Keep current structure, document deviation.

**Pros:** No code changes
**Cons:** Technical debt, testing friction
**Effort:** None
**Risk:** Low (works, just not clean)

## Recommended Action

Option A - Create port interface

## Technical Details

**New File:** `src/domain/ports/DailySyncPort.ts`
**Affected Files:** `src/application/services/SyncPlanService.ts`

## Acceptance Criteria

- [ ] Port interface created in domain layer
- [ ] SyncPlanService imports from domain, not infrastructure
- [ ] DailySyncMetadataRepository implements the port interface
- [ ] Types exported from domain layer

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-21 | Created from code review | Dependency direction violation |

## Resources

- PR: feat/incremental-per-day-sync
- Clean Architecture: Dependency Rule
