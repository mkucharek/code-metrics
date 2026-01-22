/**
 * Configuration Loader
 * Loads and merges configuration from multiple sources
 */

import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { AppConfigSchema, type AppConfig, type PartialAppConfig } from './schema';
import { z } from 'zod';
import { ConfigurationError } from '../../domain/errors';

/**
 * Warn if orphaned .metricsrc file exists
 */
function warnIfOrphanedMetricsrc(): void {
  const metricsrcPath = resolve('./.metricsrc');
  if (existsSync(metricsrcPath)) {
    console.warn('\x1b[33m⚠️  Found .metricsrc file which is no longer used.\x1b[0m');
    console.warn(
      '\x1b[33m   Migrate teams config to metrics.config.json and delete .metricsrc\x1b[0m'
    );
    console.warn('');
  }
}

/**
 * Parse NODE_ENV with validation
 */
function parseNodeEnv(
  value: string | undefined
): 'development' | 'production' | 'test' | undefined {
  const NodeEnvSchema = z.enum(['development', 'production', 'test']);
  const result = NodeEnvSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Parse LOG_LEVEL with validation
 */
function parseLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' | undefined {
  const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);
  const result = LogLevelSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): Partial<PartialAppConfig> {
  // Load .env file if it exists
  loadDotenv();

  const config: Partial<PartialAppConfig> = {
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    github: {
      token: process.env.GITHUB_TOKEN || '',
      organization: process.env.GITHUB_ORG || '',
      rateLimit: {
        maxRetries: process.env.GITHUB_RATE_LIMIT_MAX_RETRIES
          ? parseInt(process.env.GITHUB_RATE_LIMIT_MAX_RETRIES, 10)
          : undefined,
        backoffMs: process.env.GITHUB_RATE_LIMIT_BACKOFF_MS
          ? parseInt(process.env.GITHUB_RATE_LIMIT_BACKOFF_MS, 10)
          : undefined,
      },
    },
    database: {
      path: process.env.DATABASE_PATH,
      verbose: process.env.DATABASE_VERBOSE === 'true',
      walMode: process.env.DATABASE_WAL_MODE !== 'false', // Default true
    },
    logging: {
      level: parseLogLevel(process.env.LOG_LEVEL),
      colored: process.env.LOG_COLORED !== 'false', // Default true
    },
    reports: {
      defaultDateRange: process.env.DEFAULT_DATE_RANGE,
      outputDirectory: process.env.REPORT_OUTPUT_DIR,
    },
  };

  return config;
}

/**
 * Schema for validating config file JSON (allows partial config)
 */
const ConfigFileSchema = AppConfigSchema.partial().passthrough();

/**
 * Load configuration from JSON file
 */
function loadFromFile(filePath: string): Partial<PartialAppConfig> {
  const absolutePath = resolve(filePath);

  if (!existsSync(absolutePath)) {
    return {};
  }

  try {
    const content = readFileSync(absolutePath, 'utf-8');
    const jsonData: unknown = JSON.parse(content);

    // Use Zod to validate and parse the JSON
    const parsed = ConfigFileSchema.parse(jsonData);
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigurationError(
        `Failed to load config file at ${absolutePath}: ${error.message}`,
        undefined,
        error
      );
    }
    throw new ConfigurationError(`Failed to load config file at ${absolutePath}: ${String(error)}`);
  }
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Configuration loader options
 */
export interface LoadConfigOptions {
  /** Path to config file (optional) */
  configFile?: string;

  /** Override configuration (e.g., from CLI args) */
  overrides?: Partial<PartialAppConfig>;

  /** Whether to load .env file (default: true) */
  loadEnv?: boolean;
}

/**
 * Load and validate application configuration
 *
 * Precedence (highest to lowest):
 * 1. CLI argument overrides
 * 2. Config file (JSON)
 * 3. Environment variables (.env)
 * 4. Defaults from schema
 */
export function loadConfig(options: LoadConfigOptions = {}): AppConfig {
  const { configFile = './metrics.config.json', overrides = {}, loadEnv = true } = options;

  // Warn if orphaned .metricsrc file exists
  warnIfOrphanedMetricsrc();

  // Start with empty config
  let config: Partial<PartialAppConfig> = {};

  // 1. Load from environment variables (lowest precedence)
  if (loadEnv) {
    config = deepMerge(config, loadFromEnv());
  }

  // 2. Load from config file (if exists)
  if (configFile && existsSync(resolve(configFile))) {
    const fileConfig = loadFromFile(configFile);
    config = deepMerge(config, fileConfig);
  }

  // 3. Apply overrides (highest precedence)
  if (overrides) {
    config = deepMerge(config, overrides);
  }

  // Validate and apply defaults
  try {
    return AppConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigurationError(`Invalid configuration: ${error.message}`, undefined, error);
    }
    throw error;
  }
}

/**
 * Cached configuration singleton
 */
let cachedConfig: AppConfig | null = null;

/**
 * Get application configuration (cached)
 */
export function getConfig(options?: LoadConfigOptions): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig(options);
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}
