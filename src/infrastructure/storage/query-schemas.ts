/**
 * Query Result Schemas
 * Zod schemas for validating SQL query results
 */

import { z } from 'zod';

/**
 * Schema for COUNT(*) query results
 */
export const CountResultSchema = z.object({
  count: z.number(),
});

/**
 * Schema for author results
 */
export const AuthorResultSchema = z.object({
  author: z.string(),
});

/**
 * Schema for reviewer results
 */
export const ReviewerResultSchema = z.object({
  reviewer: z.string(),
});

/**
 * Schema for migration version results
 */
export const VersionResultSchema = z.object({
  version: z.number().nullable(),
});

/**
 * Schema for migration list results
 */
export const MigrationResultSchema = z.object({
  version: z.number(),
  description: z.string(),
  appliedAt: z.string(),
});

/**
 * Validate array of query results
 */
export function validateQueryResults<T>(schema: z.ZodType<T>, results: unknown): T[] {
  return z.array(schema).parse(results);
}

/**
 * Validate single query result
 */
export function validateQueryResult<T>(schema: z.ZodType<T>, result: unknown): T {
  return schema.parse(result);
}
