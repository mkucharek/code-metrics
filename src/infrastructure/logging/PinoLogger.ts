/**
 * Pino Logger Implementation
 * Structured JSON logging with Pino
 */

import pino from 'pino';
import type { Logger, LogLevel, LogMeta } from './Logger';

/**
 * Pino logger configuration
 */
export interface PinoLoggerConfig {
  level: LogLevel;
  pretty?: boolean;
  name?: string;
}

/**
 * Pino logger implementation
 * Provides structured JSON logging
 */
export class PinoLogger implements Logger {
  private logger: pino.Logger;

  constructor(config: PinoLoggerConfig) {
    const transport = config.pretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined;

    this.logger = pino({
      name: config.name ?? 'metrics',
      level: config.level,
      transport,
    });
  }

  debug(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.debug(meta, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.info(meta, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.warn(meta, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, error?: Error, meta?: LogMeta): void {
    const errorData = error
      ? {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
          ...meta,
        }
      : meta;

    if (errorData) {
      this.logger.error(errorData, message);
    } else {
      this.logger.error(message);
    }
  }

  child(bindings: LogMeta): Logger {
    const childLogger = this.logger.child(bindings);
    return new PinoLoggerWrapper(childLogger);
  }
}

/**
 * Wrapper around pino child logger
 */
class PinoLoggerWrapper implements Logger {
  constructor(private logger: pino.Logger) {}

  debug(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.debug(meta, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.info(meta, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (meta) {
      this.logger.warn(meta, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, error?: Error, meta?: LogMeta): void {
    const errorData = error
      ? {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
          ...meta,
        }
      : meta;

    if (errorData) {
      this.logger.error(errorData, message);
    } else {
      this.logger.error(message);
    }
  }

  child(bindings: LogMeta): Logger {
    return new PinoLoggerWrapper(this.logger.child(bindings));
  }
}
