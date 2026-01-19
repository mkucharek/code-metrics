import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { loadConfig, resetConfig, getConfig } from './loader';

describe('Configuration Loader', () => {
  const testConfigPath = './test.config.json';

  beforeEach(() => {
    // Reset cached config before each test
    resetConfig();

    // Clear environment variables that might interfere
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_ORG;
    delete process.env.DATABASE_PATH;
  });

  afterEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
    resetConfig();
  });

  describe('loadConfig', () => {
    it('loads configuration with required fields', () => {
      const config = loadConfig({
        loadEnv: false,
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      expect(config.github.token).toBe('test-token');
      expect(config.github.organization).toBe('test-org');
    });

    it('applies default values from schema', () => {
      const config = loadConfig({
        loadEnv: false,
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      expect(config.nodeEnv).toBe('development');
      expect(config.database.path).toBe('./data/metrics.db');
      expect(config.database.walMode).toBe(true);
      expect(config.logging.level).toBe('info');
      expect(config.github.rateLimit.maxRetries).toBe(3);
    });

    it('throws error when required fields are missing', () => {
      expect(() => {
        loadConfig({
          loadEnv: false,
          overrides: {},
        });
      }).toThrow('Invalid configuration');
    });

    it('loads from config file', () => {
      const fileConfig = {
        github: {
          token: 'file-token',
          organization: 'file-org',
        },
        database: {
          path: './custom/path.db',
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(fileConfig));

      const config = loadConfig({
        loadEnv: false,
        configFile: testConfigPath,
      });

      expect(config.github.token).toBe('file-token');
      expect(config.github.organization).toBe('file-org');
      expect(config.database.path).toBe('./custom/path.db');
    });

    it('merges config file with overrides (overrides win)', () => {
      const fileConfig = {
        github: {
          token: 'file-token',
          organization: 'file-org',
        },
        database: {
          path: './file-path.db',
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(fileConfig));

      const config = loadConfig({
        loadEnv: false,
        configFile: testConfigPath,
        overrides: {
          github: {
            token: 'override-token',
            organization: 'file-org', // Keep from file
          },
        },
      });

      expect(config.github.token).toBe('override-token'); // Override wins
      expect(config.github.organization).toBe('file-org'); // From file
      expect(config.database.path).toBe('./file-path.db'); // From file
    });

    it('handles missing config file gracefully', () => {
      const config = loadConfig({
        loadEnv: false,
        configFile: './nonexistent.config.json',
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      expect(config.github.token).toBe('test-token');
    });

    it('validates JSON structure with Zod', () => {
      // Create invalid config file
      const invalidConfig = {
        github: {
          token: 'test-token',
          organization: 'test-org',
          rateLimit: {
            maxRetries: 'invalid', // Should be number
          },
        },
      };

      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      expect(() => {
        loadConfig({
          loadEnv: false,
          configFile: testConfigPath,
        });
      }).toThrow('Failed to load config file');
    });

    it('rejects malformed JSON', () => {
      // Create malformed JSON file
      writeFileSync(testConfigPath, '{ invalid json');

      expect(() => {
        loadConfig({
          loadEnv: false,
          configFile: testConfigPath,
        });
      }).toThrow('Failed to load config file');
    });

    it('validates enum values', () => {
      expect(() => {
        loadConfig({
          loadEnv: false,
          overrides: {
            nodeEnv: 'invalid' as 'development',
            github: {
              token: 'test-token',
              organization: 'test-org',
            },
          },
        });
      }).toThrow();
    });

    it('validates numeric constraints', () => {
      expect(() => {
        loadConfig({
          loadEnv: false,
          overrides: {
            github: {
              token: 'test-token',
              organization: 'test-org',
              rateLimit: {
                maxRetries: -1, // Invalid: must be >= 0
              },
            },
          },
        });
      }).toThrow();
    });

    it('loads from environment variables', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      process.env.GITHUB_ORG = 'env-org';
      process.env.DATABASE_PATH = './env-path.db';
      process.env.LOG_LEVEL = 'debug';

      const config = loadConfig({
        loadEnv: true,
      });

      expect(config.github.token).toBe('env-token');
      expect(config.github.organization).toBe('env-org');
      expect(config.database.path).toBe('./env-path.db');
      expect(config.logging.level).toBe('debug');
    });

    it('applies correct precedence: overrides > file > env', () => {
      // Set up environment
      process.env.GITHUB_TOKEN = 'env-token';
      process.env.GITHUB_ORG = 'env-org';
      process.env.DATABASE_PATH = './env-path.db';

      // Set up file
      const fileConfig = {
        github: {
          token: 'file-token',
          organization: 'env-org', // Keep from env
        },
        database: {
          path: './file-path.db',
        },
      };
      writeFileSync(testConfigPath, JSON.stringify(fileConfig));

      // Load with overrides
      const config = loadConfig({
        loadEnv: true,
        configFile: testConfigPath,
        overrides: {
          github: {
            token: 'override-token',
            organization: 'env-org', // Keep from env
          },
        },
      });

      expect(config.github.token).toBe('override-token'); // Override wins
      expect(config.github.organization).toBe('env-org'); // From env/file
      expect(config.database.path).toBe('./file-path.db'); // File wins over env
    });
  });

  describe('getConfig', () => {
    it('caches configuration', () => {
      const config1 = getConfig({
        loadEnv: false,
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      const config2 = getConfig();

      expect(config1).toBe(config2); // Same object reference
    });

    it('returns cached config on subsequent calls', () => {
      getConfig({
        loadEnv: false,
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      // Second call should return cached version (no options needed)
      const config = getConfig();
      expect(config.github.token).toBe('test-token');
    });
  });

  describe('resetConfig', () => {
    it('clears cached configuration', () => {
      getConfig({
        loadEnv: false,
        overrides: {
          github: {
            token: 'test-token',
            organization: 'test-org',
          },
        },
      });

      resetConfig();

      // Should throw because cache is cleared and no config provided
      expect(() => getConfig({ loadEnv: false })).toThrow();
    });
  });

  describe('deep merge', () => {
    it('deeply merges nested objects', () => {
      const fileConfig = {
        github: {
          token: 'file-token',
          organization: 'file-org',
          rateLimit: {
            maxRetries: 5,
            // backoffMs not specified
          },
        },
      };
      writeFileSync(testConfigPath, JSON.stringify(fileConfig));

      const config = loadConfig({
        loadEnv: false,
        configFile: testConfigPath,
        overrides: {
          github: {
            token: 'file-token', // Keep from file
            organization: 'file-org', // Keep from file
            rateLimit: {
              backoffMs: 2000,
              // maxRetries not specified, should keep from file
            },
          },
        },
      });

      expect(config.github.token).toBe('file-token');
      expect(config.github.organization).toBe('file-org');
      expect(config.github.rateLimit.maxRetries).toBe(5); // From file
      expect(config.github.rateLimit.backoffMs).toBe(2000); // From override
    });
  });
});
