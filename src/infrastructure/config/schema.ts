/**
 * Configuration Schema
 * Zod schemas for application configuration
 */

import { z } from 'zod';

/**
 * GitHub configuration schema
 */
export const GitHubConfigSchema = z.object({
  /** GitHub personal access token */
  token: z.string().min(1, 'GitHub token is required'),

  /** GitHub organization name */
  organization: z.string().min(1, 'GitHub organization is required'),

  /** Rate limit configuration */
  rateLimit: z
    .object({
      maxRetries: z.number().int().min(0).default(3),
      backoffMs: z.number().int().min(100).default(1000),
    })
    .default({ maxRetries: 3, backoffMs: 1000 }),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Database configuration schema
 */
export const DatabaseConfigSchema = z
  .object({
    /** Path to SQLite database file */
    path: z.string().default('./data/metrics.db'),

    /** Enable verbose logging for database operations */
    verbose: z.boolean().default(false),

    /** Enable WAL mode (recommended for better concurrency) */
    walMode: z.boolean().default(true),
  })
  .default({ path: './data/metrics.db', verbose: false, walMode: true });

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Logging configuration schema
 */
export const LoggingConfigSchema = z
  .object({
    /** Log level */
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    /** Enable colored output */
    colored: z.boolean().default(true),
  })
  .default({ level: 'info', colored: true });

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

/**
 * Reports configuration schema
 */
export const ReportsConfigSchema = z
  .object({
    /** Default date range for reports */
    defaultDateRange: z.string().default('last-30-days'),

    /** Output directory for generated reports */
    outputDirectory: z.string().default('./reports'),

    /** Users to exclude from reports (e.g., service accounts) */
    excludedUsers: z.array(z.string()).default([]),
  })
  .default({
    defaultDateRange: 'last-30-days',
    outputDirectory: './reports',
    excludedUsers: [],
  });

export type ReportsConfig = z.infer<typeof ReportsConfigSchema>;

/**
 * Team definition schema
 */
export const TeamSchema = z.object({
  /** Display name for the team */
  name: z.string().min(1, 'Team name is required'),

  /** Optional description of the team */
  description: z.string().optional(),

  /** List of GitHub usernames in this team */
  members: z.array(z.string()).default([]),

  /** List of repositories this team primarily works on */
  repositories: z.array(z.string()).default([]),
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * Teams configuration schema
 * Maps team ID to team definition
 */
export const TeamsConfigSchema = z.record(z.string(), TeamSchema).default({});

export type TeamsConfig = z.infer<typeof TeamsConfigSchema>;

/**
 * Complete application configuration schema
 */
export const AppConfigSchema = z.object({
  /** Node environment */
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  /** GitHub configuration */
  github: GitHubConfigSchema,

  /** Database configuration */
  database: DatabaseConfigSchema,

  /** Logging configuration */
  logging: LoggingConfigSchema,

  /** Reports configuration */
  reports: ReportsConfigSchema,

  /** Teams configuration */
  teams: TeamsConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Partial configuration for merging
 */
export type PartialAppConfig = z.input<typeof AppConfigSchema>;
