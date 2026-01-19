/**
 * Configuration Validator
 * Validates GitHub configuration and access at startup
 */

import { Octokit } from '@octokit/rest';
import type { GitHubConfig } from './schema';
import { ConfigurationError } from '../../domain/errors';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    tokenValid?: boolean;
    organizationAccessible?: boolean;
    scopes?: string[];
    missingScopes?: string[];
  };
}

/**
 * Validate GitHub configuration
 * Tests authentication, org access, and token scopes
 */
export async function validateGitHubConfig(config: GitHubConfig): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    details: {},
  };

  const octokit = new Octokit({ auth: config.token });

  // 1. Test authentication
  try {
    await octokit.users.getAuthenticated();
    result.details.tokenValid = true;
  } catch (error) {
    result.valid = false;
    result.details.tokenValid = false;

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Bad credentials')) {
        result.errors.push('Invalid GitHub token. Please check GITHUB_TOKEN in your .env file.');
        result.errors.push('Generate a new token at: https://github.com/settings/tokens');
      } else {
        result.errors.push(`Authentication failed: ${error.message}`);
      }
    }

    // If token is invalid, no point checking further
    return result;
  }

  // 2. Test organization access
  try {
    await octokit.orgs.get({ org: config.organization });
    result.details.organizationAccessible = true;
  } catch (error) {
    result.valid = false;
    result.details.organizationAccessible = false;

    if (error instanceof Error) {
      if (error.message.includes('404')) {
        result.errors.push(`Organization "${config.organization}" not found or not accessible.`);
        result.errors.push('Check GITHUB_ORG in your .env file.');
      } else {
        result.errors.push(`Organization access failed: ${error.message}`);
      }
    }
  }

  // 3. Check token scopes
  try {
    const { headers } = await octokit.request('GET /user');
    const scopesHeader = headers['x-oauth-scopes'] as string | undefined;
    const scopes = scopesHeader?.split(', ').map((s) => s.trim()) ?? [];

    result.details.scopes = scopes;

    const requiredScopes = ['repo', 'read:org'];
    const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));

    if (missingScopes.length > 0) {
      result.valid = false;
      result.details.missingScopes = missingScopes;
      result.errors.push(`Token missing required scopes: ${missingScopes.join(', ')}`);
      result.errors.push('When generating a token, select these scopes: repo, read:org, read:user');
    }
  } catch {
    // Non-critical error - token might still work
    result.warnings.push('Could not verify token scopes');
  }

  return result;
}

/**
 * Validate configuration and throw on failure
 * Useful for startup checks
 */
export async function validateOrThrow(config: GitHubConfig): Promise<void> {
  const result = await validateGitHubConfig(config);

  if (!result.valid) {
    const errorMessage = ['Configuration validation failed:', ...result.errors].join('\n  ');
    throw new ConfigurationError(errorMessage);
  }

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn('Configuration warnings:');
    result.warnings.forEach((warning) => console.warn(`  ${warning}`));
  }
}
