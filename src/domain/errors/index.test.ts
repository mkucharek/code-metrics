/**
 * Error Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  GitHubAuthenticationError,
  GitHubResourceNotFoundError,
  GitHubRateLimitError,
  GitHubApiError,
  ValidationError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseMigrationError,
  ConfigurationError,
  SyncError,
  isAppError,
  toAppError,
  getUserMessage,
} from './index';

describe('Error Types', () => {
  describe('GitHubAuthenticationError', () => {
    it('creates error with correct properties', () => {
      const error = new GitHubAuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('GitHubAuthenticationError');
      expect(error.code).toBe('GITHUB_AUTH_FAILED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('GitHub authentication failed');
    });

    it('accepts custom message', () => {
      const error = new GitHubAuthenticationError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.code).toBe('GITHUB_AUTH_FAILED');
    });
  });

  describe('GitHubResourceNotFoundError', () => {
    it('creates error with resource details', () => {
      const error = new GitHubResourceNotFoundError('repository', 'web-app');

      expect(error.code).toBe('GITHUB_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.resourceType).toBe('repository');
      expect(error.resourceId).toBe('web-app');
      expect(error.message).toBe('repository not found: web-app');
    });

    it('includes resource details in JSON', () => {
      const error = new GitHubResourceNotFoundError('PR', '123');
      const json = error.toJSON();

      expect(json.resourceType).toBe('PR');
      expect(json.resourceId).toBe('123');
      expect(json.code).toBe('GITHUB_NOT_FOUND');
    });
  });

  describe('GitHubRateLimitError', () => {
    it('creates error with reset time', () => {
      const resetTime = new Date('2025-10-03T12:00:00Z');
      const error = new GitHubRateLimitError(resetTime);

      expect(error.code).toBe('GITHUB_RATE_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.resetTime).toBe(resetTime);
      expect(error.message).toContain('2025-10-03');
    });

    it('includes reset time in JSON', () => {
      const resetTime = new Date('2025-10-03T12:00:00Z');
      const error = new GitHubRateLimitError(resetTime);
      const json = error.toJSON();

      expect(json.resetTime).toBe(resetTime.toISOString());
      expect(json.resetTimeLocal).toBeDefined();
    });
  });

  describe('GitHubApiError', () => {
    it('creates error with custom status code', () => {
      const error = new GitHubApiError('Service unavailable', 503);

      expect(error.code).toBe('GITHUB_API_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service unavailable');
    });

    it('accepts cause error', () => {
      const cause = new Error('Network timeout');
      const error = new GitHubApiError('Request failed', 500, cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('creates error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('includes field names', () => {
      const error = new ValidationError('Required fields missing', ['email', 'password']);

      expect(error.fields).toEqual(['email', 'password']);
    });

    it('includes fields in JSON', () => {
      const error = new ValidationError('Invalid', ['field1', 'field2']);
      const json = error.toJSON();

      expect(json.fields).toEqual(['field1', 'field2']);
    });
  });

  describe('DatabaseError', () => {
    it('creates error with operation', () => {
      const error = new DatabaseError('Insert failed', 'insert');

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.operation).toBe('insert');
    });

    it('includes operation in JSON', () => {
      const error = new DatabaseError('Query failed', 'select');
      const json = error.toJSON();

      expect(json.operation).toBe('select');
    });
  });

  describe('DatabaseConnectionError', () => {
    it('creates error with default message', () => {
      const error = new DatabaseConnectionError();

      expect(error.code).toBe('DATABASE_CONNECTION_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database connection failed');
    });

    it('accepts custom message and cause', () => {
      const cause = new Error('Connection timeout');
      const error = new DatabaseConnectionError('Cannot connect to SQLite', cause);

      expect(error.message).toBe('Cannot connect to SQLite');
      expect(error.cause).toBe(cause);
    });
  });

  describe('DatabaseMigrationError', () => {
    it('creates error with migration version', () => {
      const error = new DatabaseMigrationError(5);

      expect(error.code).toBe('DATABASE_MIGRATION_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.migrationVersion).toBe(5);
      expect(error.message).toBe('Migration 5 failed');
    });

    it('includes migration version in JSON', () => {
      const error = new DatabaseMigrationError(3);
      const json = error.toJSON();

      expect(json.migrationVersion).toBe(3);
    });
  });

  describe('ConfigurationError', () => {
    it('creates error with message', () => {
      const error = new ConfigurationError('Invalid config');

      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Invalid config');
    });

    it('includes config key', () => {
      const error = new ConfigurationError('Missing value', 'github.token');

      expect(error.configKey).toBe('github.token');
    });

    it('includes config key in JSON', () => {
      const error = new ConfigurationError('Invalid', 'database.path');
      const json = error.toJSON();

      expect(json.configKey).toBe('database.path');
    });
  });

  describe('SyncError', () => {
    it('creates error with message', () => {
      const error = new SyncError('Sync failed');

      expect(error.code).toBe('SYNC_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Sync failed');
    });

    it('includes repository name', () => {
      const error = new SyncError('PR sync failed', 'web-app');

      expect(error.repository).toBe('web-app');
    });

    it('includes repository in JSON', () => {
      const error = new SyncError('Failed', 'api-service');
      const json = error.toJSON();

      expect(json.repository).toBe('api-service');
    });
  });

  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      const error = new ValidationError('Test');

      expect(isAppError(error)).toBe(true);
    });

    it('returns false for regular errors', () => {
      const error = new Error('Test');

      expect(isAppError(error)).toBe(false);
    });

    it('returns false for non-errors', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('returns AppError as-is', () => {
      const error = new ValidationError('Test');
      const converted = toAppError(error);

      expect(converted).toBe(error);
    });

    it('wraps regular Error', () => {
      const error = new Error('Original error');
      const converted = toAppError(error);

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('Original error');
      expect(converted.cause).toBe(error);
    });

    it('wraps non-Error values', () => {
      const converted = toAppError('string error');

      expect(converted).toBeInstanceOf(AppError);
      expect(converted.message).toBe('string error');
    });
  });

  describe('getUserMessage', () => {
    it('returns friendly message for GitHubAuthenticationError', () => {
      const error = new GitHubAuthenticationError();
      const message = getUserMessage(error);

      expect(message).toContain('Authentication failed');
      expect(message).toContain('.env');
    });

    it('returns friendly message for GitHubResourceNotFoundError', () => {
      const error = new GitHubResourceNotFoundError('repository', 'web-app');
      const message = getUserMessage(error);

      expect(message).toContain('repository');
      expect(message).toContain('web-app');
    });

    it('returns friendly message for GitHubRateLimitError', () => {
      const error = new GitHubRateLimitError(new Date());
      const message = getUserMessage(error);

      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('Resets at');
    });

    it('returns friendly message for ValidationError', () => {
      const error = new ValidationError('Invalid input', ['field1']);
      const message = getUserMessage(error);

      expect(message).toContain('Validation failed');
      expect(message).toContain('field1');
    });

    it('returns friendly message for DatabaseError', () => {
      const error = new DatabaseError('Query failed');
      const message = getUserMessage(error);

      expect(message).toContain('Database error');
    });

    it('returns friendly message for ConfigurationError', () => {
      const error = new ConfigurationError('Missing token', 'github.token');
      const message = getUserMessage(error);

      expect(message).toContain('Configuration error');
      expect(message).toContain('github.token');
    });

    it('returns message for generic AppError', () => {
      const error = new SyncError('Sync failed');
      const message = getUserMessage(error);

      expect(message).toBe('Sync failed');
    });

    it('returns message for regular Error', () => {
      const error = new Error('Regular error');
      const message = getUserMessage(error);

      expect(message).toBe('Regular error');
    });

    it('returns string for non-Error values', () => {
      const message = getUserMessage('string error');

      expect(message).toBe('string error');
    });
  });

  describe('AppError', () => {
    it('includes cause in JSON', () => {
      const cause = new Error('Root cause');
      const error = new DatabaseError('Database failed', 'insert', cause);
      const json = error.toJSON();

      expect(json.cause).toBe('Root cause');
    });

    it('captures stack trace', () => {
      const error = new ValidationError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });
});
