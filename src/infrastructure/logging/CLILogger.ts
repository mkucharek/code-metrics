/**
 * CLI Logger Implementation
 * Pretty console output with colors for CLI usage
 */

import chalk from 'chalk';
import type { Logger, LogLevel, LogMeta } from './Logger';

/**
 * CLI logger configuration
 */
export interface CLILoggerConfig {
  level: LogLevel;
  colored?: boolean;
}

/**
 * CLI logger implementation
 * Provides colored console output for terminal
 */
export class CLILogger implements Logger {
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private currentLevel: LogLevel;
  private colored: boolean;

  constructor(config: CLILoggerConfig) {
    this.currentLevel = config.level;
    this.colored = config.colored ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.currentLevel];
  }

  private formatMeta(meta?: LogMeta): string {
    if (!meta || Object.keys(meta).length === 0) {
      return '';
    }

    const formatted = Object.entries(meta)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');

    return this.colored ? chalk.gray(` [${formatted}]`) : ` [${formatted}]`;
  }

  debug(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('debug')) return;

    const prefix = this.colored ? chalk.blue('[DEBUG]') : '[DEBUG]';
    console.log(`${prefix} ${message}${this.formatMeta(meta)}`);
  }

  info(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('info')) return;

    const prefix = this.colored ? chalk.cyan('[INFO]') : '[INFO]';
    console.log(`${prefix} ${message}${this.formatMeta(meta)}`);
  }

  warn(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('warn')) return;

    const prefix = this.colored ? chalk.yellow('[WARN]') : '[WARN]';
    console.warn(`${prefix} ${message}${this.formatMeta(meta)}`);
  }

  error(message: string, error?: Error, meta?: LogMeta): void {
    if (!this.shouldLog('error')) return;

    const prefix = this.colored ? chalk.red('[ERROR]') : '[ERROR]';
    console.error(`${prefix} ${message}${this.formatMeta(meta)}`);

    if (error) {
      const errorDetails = this.colored
        ? chalk.gray(error.stack ?? error.message)
        : (error.stack ?? error.message);
      console.error(errorDetails);
    }
  }

  child(bindings: LogMeta): Logger {
    // For CLI logger, we'll just prefix messages with bindings
    return new CLILoggerChild(this, bindings);
  }
}

/**
 * CLI logger child with additional context
 */
class CLILoggerChild implements Logger {
  constructor(
    private parent: CLILogger,
    private bindings: LogMeta
  ) {}

  private mergeContext(meta?: LogMeta): LogMeta {
    return { ...this.bindings, ...meta };
  }

  debug(message: string, meta?: LogMeta): void {
    this.parent.debug(message, this.mergeContext(meta));
  }

  info(message: string, meta?: LogMeta): void {
    this.parent.info(message, this.mergeContext(meta));
  }

  warn(message: string, meta?: LogMeta): void {
    this.parent.warn(message, this.mergeContext(meta));
  }

  error(message: string, error?: Error, meta?: LogMeta): void {
    this.parent.error(message, error, this.mergeContext(meta));
  }

  child(bindings: LogMeta): Logger {
    return new CLILoggerChild(this.parent, this.mergeContext(bindings));
  }
}
