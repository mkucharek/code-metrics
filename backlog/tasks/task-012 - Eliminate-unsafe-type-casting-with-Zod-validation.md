---
id: task-012
title: Eliminate unsafe type casting with Zod validation
status: Done
assignee:
  - '@ai-assistant'
created_date: '2025-10-03 13:29'
updated_date: '2025-10-03 13:35'
labels:
  - refactor
  - type-safety
dependencies: []
priority: high
---

## Description

Replace all unsafe type assertions with proper Zod validation. Focus on SQL query results, JSON.parse() outputs, and environment variable parsing to ensure runtime type safety matches compile-time guarantees.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Add Zod schemas for all SQL query results (COUNT, DISTINCT, etc.)
- [x] #2 Validate JSON.parse() output for labels array in PRRepository
- [x] #3 Add Zod validation for environment variable enums (NODE_ENV, LOG_LEVEL)
- [x] #4 Replace numeric metric key casting with proper type constraints
- [x] #5 Replace array non-null assertions with explicit checks or optional chaining
- [x] #6 All quality checks pass (pnpm check: typecheck, lint, format:check)
- [x] #7 No new 'any' types introduced
- [x] #8 All existing tests still pass
- [x] #9 Add tests for new validation error cases
<!-- AC:END -->


## Implementation Plan

1. Create Zod schemas for SQL query result types
2. Fix all SQL query result casting in repositories (count, list queries)
3. Add Zod validation for JSON.parse in PRRepository (labels)
4. Fix environment variable enum casting with Zod or type guards
5. Improve numeric metric key type constraints in organization-metrics
6. Replace array non-null assertions with safer patterns
7. Add tests for validation error cases
8. Run full test suite and quality checks
9. Update TYPE_CASTING_AUDIT.md to reflect fixes


## Implementation Notes

## Implementation Summary

Successfully eliminated all unsafe type casting by adding comprehensive Zod validation throughout the codebase. Improved type safety from ~30 unsafe casts down to 0 high-priority issues.


## Changes Made

### 1. SQL Query Result Validation (query-schemas.ts)
Created Zod schemas for all common SQL query patterns:

**Query Schemas:**
- `CountResultSchema`: Validates COUNT(*) queries
- `AuthorResultSchema`: Validates DISTINCT author queries
- `ReviewerResultSchema`: Validates DISTINCT reviewer queries
- `VersionResultSchema`: Validates version queries (nullable)
- `MigrationResultSchema`: Validates migration history queries

**Helper Functions:**
- `validateQueryResult<T>()`: Type-safe single result validation
- `validateQueryResults<T>()`: Type-safe array validation

**Tests Added:** 17 comprehensive validation tests covering:
- Valid and invalid query results
- Type mismatches
- Missing fields
- Null/undefined handling
- Array validation

### 2. Repository Updates
**PRRepository.ts:**
- ✅ Removed: `as { count: number }` → Added: Zod validation
- ✅ Removed: `as Array<{ author: string }>` → Added: Zod validation
- ✅ Removed: `JSON.parse(row.labels) as string[]` → Added: `z.array(z.string()).parse()`

**ReviewRepository.ts:**
- ✅ Removed: count() type assertion → Added: Zod validation
- ✅ Removed: getUniqueReviewers() type assertion → Added: Zod validation

**CommentRepository.ts:**
- ✅ Removed: count() type assertion → Added: Zod validation
- ✅ Removed: getUniqueAuthors() type assertion → Added: Zod validation

### 3. Migration System Updates
**Migration.ts:**
- ✅ Removed: getCurrentVersion() type assertion → Added: Zod validation
- ✅ Removed: getAppliedMigrations() type assertion → Added: Zod validation

### 4. Environment Variable Validation (loader.ts)
**Created validation functions:**
- `parseNodeEnv()`: Uses `z.enum().safeParse()` instead of type assertion
- `parseLogLevel()`: Uses `z.enum().safeParse()` instead of type assertion

**Before:**
```typescript
nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test')
```

**After:**
```typescript
nodeEnv: parseNodeEnv(process.env.NODE_ENV)  // Validated with Zod
```

### 5. Improved Type Constraints (organization-metrics.ts)
**Created NumericMetricKey type:**
- Explicitly lists all numeric metric keys
- TypeScript now infers the values are numbers
- Added runtime validation for defensive programming

**Before:**
```typescript
const aValue = a[metric] as number;  // Unsafe cast
```

**After:**
```typescript
const aValue = a[metric];  // TypeScript knows it's a number!
if (typeof aValue !== 'number') {
  throw new Error(...);  // Defensive check
}
```

### 6. Array Non-Null Assertions Eliminated
**In computeSummaryStatistics():**
- Replaced `sorted[0]!` with explicit undefined check
- Replaced `sorted[length - 1]!` with explicit undefined check
- Added defensive error for impossible case
- Used `??` operator for safe fallbacks

**Before:**
```typescript
return {
  min: sorted[0]!,
  max: sorted[sorted.length - 1]!,
  median: sorted[Math.floor(...)]!,
};
```

**After:**
```typescript
const minValue = sorted[0];
const maxValue = sorted[sorted.length - 1];
if (minValue === undefined || maxValue === undefined) {
  throw new Error('Unexpected empty array');
}
return { min: minValue, max: maxValue, ... };
```

## Impact Analysis

### Type Safety Improvements
- **Before:** ~30 type casts, 15 unsafe (50%)
- **After:** ~15 type casts, 0 unsafe (0%)
- **Improvement:** 100% of unsafe casts eliminated ✅

### Test Coverage
- **Added:** 17 new validation tests
- **Total:** 68 tests (was 51)
- **Coverage:** +33% more tests
- **All passing:** ✅

### Runtime Safety
- SQL query results now validated at runtime
- JSON parsing validated (prevents corrupted data issues)
- Environment variables validated (catches config errors early)
- Array access validated (prevents undefined access)

## Remaining Type Casts (All Acceptable)

~15 instances remain, all justified:
- **Type guards** (8): Standard TypeScript pattern
- **Generic internals** (3): deepMerge complexity
- **Test mocking** (2): Intentional error testing
- **Safe narrowing** (2): `as const` assertions

## Documentation
Updated TYPE_CASTING_AUDIT.md with:
- Complete audit of all fixes
- Before/after comparisons
- Remaining casts explained
- Status: ✅ All high-priority issues resolved

## Quality Verification

✅ **All quality checks pass**: pnpm check
✅ **68 tests passing**: +17 new validation tests
✅ **Zero unsafe type casts**: All validated with Zod
✅ **No 'any' types**: Strict mode maintained
✅ **Better error messages**: Validation failures are clear

## Files Modified
- src/infrastructure/storage/query-schemas.ts (NEW) - Zod schemas for SQL
- src/infrastructure/storage/query-schemas.test.ts (NEW) - 17 tests
- src/infrastructure/storage/repositories/PRRepository.ts - Zod validation
- src/infrastructure/storage/repositories/ReviewRepository.ts - Zod validation
- src/infrastructure/storage/repositories/CommentRepository.ts - Zod validation
- src/infrastructure/storage/migrations/Migration.ts - Zod validation
- src/infrastructure/config/loader.ts - Env var validation
- src/domain/metrics/organization-metrics.ts - Better types, no assertions
- TYPE_CASTING_AUDIT.md - Updated with fixes

## Benefits
- 🛡️ Runtime safety matches compile-time guarantees
- 🐛 Catches data corruption issues early
- 📝 Better error messages for debugging
- ✅ More idiomatic TypeScript
- 🎯 Aligns with project's "use Zod everywhere" principle
