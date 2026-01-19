/**
 * Configuration Service
 * Handles configuration loading and validation
 */

import type { AppConfig } from '../../infrastructure/config/schema';
import { getConfig, validateGitHubConfig } from '../../infrastructure/config';

/**
 * Result of configuration validation
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    scopes?: string[];
  };
}

/**
 * Configuration Service
 * Provides configuration management and validation
 */
export class ConfigService {
  private cachedConfig: AppConfig | null = null;

  /**
   * Get configuration (cached)
   */
  getConfig(): AppConfig {
    if (!this.cachedConfig) {
      this.cachedConfig = getConfig();
    }
    return this.cachedConfig;
  }

  /**
   * Validate GitHub configuration
   */
  async validateGitHubConfig(): Promise<ConfigValidationResult> {
    const config = this.getConfig();
    return await validateGitHubConfig(config.github);
  }

  /**
   * Clear cached configuration (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
  }
}
