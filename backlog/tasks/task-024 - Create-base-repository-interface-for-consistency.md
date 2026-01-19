---
id: task-024
title: Create base repository interface for consistency
status: To Do
assignee: []
created_date: '2025-10-03 18:42'
labels:
  - quality
  - refactoring
dependencies: []
priority: medium
---

## Description

Repositories have inconsistent APIs and duplicate code. Need a base interface and abstract class.

Create:
- BaseRepository<T, ID> interface
- SQLiteRepository<T, ID> abstract class
- Common methods: save, saveBatch, findById, count, exists
- Abstract methods: tableName, toDomain, toDatabase

Refactor existing repositories to extend base.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define BaseRepository interface with common methods
- [ ] #2 Create SQLiteRepository abstract class
- [ ] #3 Implement common methods in base class
- [ ] #4 Refactor PRRepository to extend base
- [ ] #5 Refactor ReviewRepository to extend base
- [ ] #6 Refactor CommentRepository to extend base
- [ ] #7 Refactor SyncMetadataRepository to extend base
- [ ] #8 Add generic repository utilities
- [ ] #9 Update tests to use base interface
<!-- AC:END -->
