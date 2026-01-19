import { describe, it, expect } from 'vitest';
import {
  CountResultSchema,
  AuthorResultSchema,
  ReviewerResultSchema,
  VersionResultSchema,
  MigrationResultSchema,
  validateQueryResult,
  validateQueryResults,
} from './query-schemas';

describe('Query Schemas', () => {
  describe('CountResultSchema', () => {
    it('validates correct count result', () => {
      const result = CountResultSchema.parse({ count: 42 });
      expect(result.count).toBe(42);
    });

    it('rejects invalid count result', () => {
      expect(() => CountResultSchema.parse({ count: 'invalid' })).toThrow();
      expect(() => CountResultSchema.parse({ wrong: 42 })).toThrow();
      expect(() => CountResultSchema.parse({})).toThrow();
    });
  });

  describe('AuthorResultSchema', () => {
    it('validates correct author result', () => {
      const result = AuthorResultSchema.parse({ author: 'alice' });
      expect(result.author).toBe('alice');
    });

    it('rejects invalid author result', () => {
      expect(() => AuthorResultSchema.parse({ author: 123 })).toThrow();
      expect(() => AuthorResultSchema.parse({})).toThrow();
    });
  });

  describe('ReviewerResultSchema', () => {
    it('validates correct reviewer result', () => {
      const result = ReviewerResultSchema.parse({ reviewer: 'bob' });
      expect(result.reviewer).toBe('bob');
    });

    it('rejects invalid reviewer result', () => {
      expect(() => ReviewerResultSchema.parse({ reviewer: null })).toThrow();
    });
  });

  describe('VersionResultSchema', () => {
    it('validates version with number', () => {
      const result = VersionResultSchema.parse({ version: 5 });
      expect(result.version).toBe(5);
    });

    it('validates version with null', () => {
      const result = VersionResultSchema.parse({ version: null });
      expect(result.version).toBeNull();
    });

    it('rejects invalid version', () => {
      expect(() => VersionResultSchema.parse({ version: 'invalid' })).toThrow();
    });
  });

  describe('MigrationResultSchema', () => {
    it('validates correct migration result', () => {
      const result = MigrationResultSchema.parse({
        version: 1,
        description: 'Test migration',
        appliedAt: '2025-10-03T12:00:00Z',
      });

      expect(result.version).toBe(1);
      expect(result.description).toBe('Test migration');
      expect(result.appliedAt).toBe('2025-10-03T12:00:00Z');
    });

    it('rejects incomplete migration result', () => {
      expect(() =>
        MigrationResultSchema.parse({
          version: 1,
          // missing description and appliedAt
        })
      ).toThrow();
    });
  });

  describe('validateQueryResult', () => {
    it('validates and returns single result', () => {
      const result = validateQueryResult(CountResultSchema, { count: 10 });
      expect(result.count).toBe(10);
    });

    it('throws on invalid single result', () => {
      expect(() => validateQueryResult(CountResultSchema, { count: 'invalid' })).toThrow();
      expect(() => validateQueryResult(CountResultSchema, null)).toThrow();
      expect(() => validateQueryResult(CountResultSchema, undefined)).toThrow();
    });
  });

  describe('validateQueryResults', () => {
    it('validates and returns array of results', () => {
      const results = validateQueryResults(AuthorResultSchema, [
        { author: 'alice' },
        { author: 'bob' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]?.author).toBe('alice');
      expect(results[1]?.author).toBe('bob');
    });

    it('validates empty array', () => {
      const results = validateQueryResults(AuthorResultSchema, []);
      expect(results).toHaveLength(0);
    });

    it('throws on non-array input', () => {
      expect(() => validateQueryResults(AuthorResultSchema, { author: 'alice' })).toThrow();
      expect(() => validateQueryResults(AuthorResultSchema, null)).toThrow();
    });

    it('throws on invalid items in array', () => {
      expect(() =>
        validateQueryResults(AuthorResultSchema, [{ author: 'alice' }, { author: 123 }])
      ).toThrow();
    });
  });
});
