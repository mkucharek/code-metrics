/**
 * Configuration Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from './ConfigService';
import * as configModule from '../../infrastructure/config';

// Mock config module
vi.mock('../../infrastructure/config', () => ({
  getConfig: vi.fn(),
  validateGitHubConfig: vi.fn(),
}));

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getConfig', () => {
    it('should load and return configuration', () => {
      const mockConfig = {
        nodeEnv: 'test' as const,
        github: {
          token: 'test-token',
          organization: 'test-org',
          rateLimit: { maxRetries: 3, backoffMs: 1000 },
        },
        database: {
          path: ':memory:',
          verbose: false,
          walMode: false,
        },
        logging: {
          level: 'info' as const,
          colored: true,
        },
        reports: {
          defaultDateRange: 'last-30-days',
          outputDirectory: './reports',
          excludedUsers: [],
        },
        teams: {},
      };

      vi.mocked(configModule.getConfig).mockReturnValue(mockConfig);

      const config = service.getConfig();

      expect(config).toEqual(mockConfig);
      expect(configModule.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should cache configuration after first load', () => {
      const mockConfig = {
        nodeEnv: 'test' as const,
        github: {
          token: 'test-token',
          organization: 'test-org',
          rateLimit: { maxRetries: 3, backoffMs: 1000 },
        },
        database: {
          path: ':memory:',
          verbose: false,
          walMode: false,
        },
        logging: {
          level: 'info' as const,
          colored: true,
        },
        reports: {
          defaultDateRange: 'last-30-days',
          outputDirectory: './reports',
          excludedUsers: [],
        },
        teams: {},
      };

      vi.mocked(configModule.getConfig).mockReturnValue(mockConfig);

      // Call twice
      service.getConfig();
      service.getConfig();

      // Should only load once
      expect(configModule.getConfig).toHaveBeenCalledTimes(1);
    });

    it('should reload configuration after cache clear', () => {
      const mockConfig = {
        nodeEnv: 'test' as const,
        github: {
          token: 'test-token',
          organization: 'test-org',
          rateLimit: { maxRetries: 3, backoffMs: 1000 },
        },
        database: {
          path: ':memory:',
          verbose: false,
          walMode: false,
        },
        logging: {
          level: 'info' as const,
          colored: true,
        },
        reports: {
          defaultDateRange: 'last-30-days',
          outputDirectory: './reports',
          excludedUsers: [],
        },
        teams: {},
      };

      vi.mocked(configModule.getConfig).mockReturnValue(mockConfig);

      service.getConfig();
      service.clearCache();
      service.getConfig();

      // Should load twice (once before clear, once after)
      expect(configModule.getConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateGitHubConfig', () => {
    it('should validate GitHub configuration', async () => {
      const mockConfig = {
        nodeEnv: 'test' as const,
        github: {
          token: 'test-token',
          organization: 'test-org',
          rateLimit: { maxRetries: 3, backoffMs: 1000 },
        },
        database: {
          path: ':memory:',
          verbose: false,
          walMode: false,
        },
        logging: {
          level: 'info' as const,
          colored: true,
        },
        reports: {
          defaultDateRange: 'last-30-days',
          outputDirectory: './reports',
          excludedUsers: [],
        },
        teams: {},
      };

      const mockValidation = {
        valid: true,
        errors: [],
        warnings: [],
        details: {
          scopes: ['repo', 'read:org'],
        },
      };

      vi.mocked(configModule.getConfig).mockReturnValue(mockConfig);
      vi.mocked(configModule.validateGitHubConfig).mockResolvedValue(mockValidation);

      const result = await service.validateGitHubConfig();

      expect(result).toEqual(mockValidation);
      expect(configModule.validateGitHubConfig).toHaveBeenCalledWith(mockConfig.github);
    });

    it('should return validation errors when configuration is invalid', async () => {
      const mockConfig = {
        nodeEnv: 'test' as const,
        github: {
          token: 'invalid-token',
          organization: 'test-org',
          rateLimit: { maxRetries: 3, backoffMs: 1000 },
        },
        database: {
          path: ':memory:',
          verbose: false,
          walMode: false,
        },
        logging: {
          level: 'info' as const,
          colored: true,
        },
        reports: {
          defaultDateRange: 'last-30-days',
          outputDirectory: './reports',
          excludedUsers: [],
        },
        teams: {},
      };

      const mockValidation = {
        valid: false,
        errors: ['Invalid token'],
        warnings: [],
        details: {},
      };

      vi.mocked(configModule.getConfig).mockReturnValue(mockConfig);
      vi.mocked(configModule.validateGitHubConfig).mockResolvedValue(mockValidation);

      const result = await service.validateGitHubConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid token');
    });
  });
});
