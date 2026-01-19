/**
 * Domain Error Types
 * Custom error classes for type-safe error handling
 */

/**
 * Base application error
 * All custom errors extend this class
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      cause: this.cause?.message,
    };
  }
}

// ============================================================================
// GitHub API Errors
// ============================================================================

/**
 * GitHub authentication failed (invalid token)
 */
export class GitHubAuthenticationError extends AppError {
  readonly code = 'GITHUB_AUTH_FAILED';
  readonly statusCode = 401;

  constructor(message = 'GitHub authentication failed') {
    super(message);
  }
}

/**
 * GitHub resource not found (repo, PR, etc.)
 */
export class GitHubResourceNotFoundError extends AppError {
  readonly code = 'GITHUB_NOT_FOUND';
  readonly statusCode = 404;

  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
    message?: string
  ) {
    super(message ?? `${resourceType} not found: ${resourceId}`);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

/**
 * GitHub API rate limit exceeded
 */
export class GitHubRateLimitError extends AppError {
  readonly code = 'GITHUB_RATE_LIMIT';
  readonly statusCode = 429;

  constructor(public readonly resetTime: Date) {
    super(`GitHub API rate limit exceeded. Resets at ${resetTime.toISOString()}`);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resetTime: this.resetTime.toISOString(),
      resetTimeLocal: this.resetTime.toLocaleString(),
    };
  }
}

/**
 * GitHub API request failed (network, server error, etc.)
 */
export class GitHubApiError extends AppError {
  readonly code = 'GITHUB_API_ERROR';
  readonly statusCode: number;

  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Data validation failed (Zod, type guards, etc.)
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly fields?: string[]
  ) {
    super(message);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

// ============================================================================
// Database Errors
// ============================================================================

/**
 * Database operation failed
 */
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly operation?: string,
    cause?: Error
  ) {
    super(message, cause);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation,
    };
  }
}

/**
 * Database connection failed
 */
export class DatabaseConnectionError extends AppError {
  readonly code = 'DATABASE_CONNECTION_FAILED';
  readonly statusCode = 500;

  constructor(message = 'Database connection failed', cause?: Error) {
    super(message, cause);
  }
}

/**
 * Database migration failed
 */
export class DatabaseMigrationError extends AppError {
  readonly code = 'DATABASE_MIGRATION_FAILED';
  readonly statusCode = 500;

  constructor(
    public readonly migrationVersion: number,
    message?: string,
    cause?: Error
  ) {
    super(message ?? `Migration ${migrationVersion} failed`, cause);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      migrationVersion: this.migrationVersion,
    };
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Configuration error (invalid config, missing env vars, etc.)
 */
export class ConfigurationError extends AppError {
  readonly code = 'CONFIG_ERROR';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly configKey?: string,
    cause?: Error
  ) {
    super(message, cause);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      configKey: this.configKey,
    };
  }
}

// ============================================================================
// Sync Errors
// ============================================================================

/**
 * Synchronization failed
 */
export class SyncError extends AppError {
  readonly code = 'SYNC_FAILED';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly repository?: string,
    cause?: Error
  ) {
    super(message, cause);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      repository: this.repository,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Generic unknown error
 */
class UnknownError extends AppError {
  readonly code = 'UNKNOWN_ERROR';
  readonly statusCode = 500;
}

/**
 * Convert unknown error to AppError
 * Useful for wrapping third-party errors
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new UnknownError(error.message, error);
  }

  return new UnknownError(String(error));
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof GitHubAuthenticationError) {
    return 'Authentication failed. Please check your GitHub token in .env';
  }

  if (error instanceof GitHubResourceNotFoundError) {
    return `${error.resourceType} not found: ${error.resourceId}`;
  }

  if (error instanceof GitHubRateLimitError) {
    return `Rate limit exceeded. Resets at ${error.resetTime.toLocaleString()}`;
  }

  if (error instanceof ValidationError) {
    const fields = error.fields ? ` (${error.fields.join(', ')})` : '';
    return `Validation failed${fields}: ${error.message}`;
  }

  if (error instanceof DatabaseError) {
    return `Database error: ${error.message}`;
  }

  if (error instanceof ConfigurationError) {
    const key = error.configKey ? ` (${error.configKey})` : '';
    return `Configuration error${key}: ${error.message}`;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
