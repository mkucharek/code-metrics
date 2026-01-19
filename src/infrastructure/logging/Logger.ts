/**
 * Logger Interface
 * Abstraction for logging throughout the application
 */

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger metadata
 */
export type LogMeta = Record<string, unknown>;

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  /**
   * Log debug message (lowest priority)
   */
  debug(message: string, meta?: LogMeta): void;

  /**
   * Log info message (normal priority)
   */
  info(message: string, meta?: LogMeta): void;

  /**
   * Log warning message (high priority)
   */
  warn(message: string, meta?: LogMeta): void;

  /**
   * Log error message (highest priority)
   */
  error(message: string, error?: Error, meta?: LogMeta): void;

  /**
   * Create child logger with additional context
   */
  child(bindings: LogMeta): Logger;
}

/**
 * Silent logger (no-op)
 * Useful for tests
 */
export class SilentLogger implements Logger {
  debug(): void {
    // Silent
  }

  info(): void {
    // Silent
  }

  warn(): void {
    // Silent
  }

  error(): void {
    // Silent
  }

  child(): Logger {
    return this;
  }
}
