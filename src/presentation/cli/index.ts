#!/usr/bin/env node

/**
 * CLI Entry Point
 * Main entry point for the metrics CLI application
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { getTeam, getTeamMembers, getTeamRepositories } from '../../infrastructure/config';
import { initializeDatabase } from '../../infrastructure/storage/database';
import { applyMigrations, ALL_MIGRATIONS } from '../../infrastructure/storage/migrations';
import {
  isAppError,
  getUserMessage,
  GitHubAuthenticationError,
  GitHubResourceNotFoundError,
  GitHubRateLimitError,
  ConfigurationError,
  DatabaseError,
  ValidationError,
  SyncError,
} from '../../domain/errors';
import { ConfigService, SyncService, ReportGenerator } from '../../application';
import {
  formatOrganizationReport,
  formatTeamRankings,
  formatOrganizationJSON,
  formatEngineerDetailReport,
  formatEngineerDetailJSON,
  formatEngineerDetailCSV,
  formatRepositoryHealthReport,
} from '../formatters';
import { formatLocalDate } from '../../domain/utils/dates';

const program = new Command();

program.name('metrics').description('Engineering Metrics CLI').version('1.0.0');

/**
 * Options for sync command
 */
interface SyncCommandOptions {
  repo?: string;
  excludeRepo?: string;
  since: string;
  until?: string;
  force: boolean;
}

/**
 * Sync command
 */
program
  .command('sync')
  .description('Sync GitHub data to local database')
  .option('-r, --repo <repo>', 'Repository name (optional - syncs all repos if not provided)')
  .option(
    '--exclude-repo <repos>',
    'Exclude repositories from sync (comma-separated, e.g., "old-repo,archived-repo")'
  )
  .option(
    '-s, --since <date>',
    'Start date (ISO format or days ago, e.g., "30" for last 30 days)',
    '30'
  )
  .option('-u, --until <date>', 'End date (ISO format, defaults to end of today)')
  .option('-f, --force', 'Force resync even if already synced', false)
  .action(async (options: SyncCommandOptions) => {
    const spinner = ora('Initializing...').start();
    const configService = new ConfigService();
    let syncService: SyncService | null = null;

    try {
      // Load config
      spinner.text = 'Loading configuration...';
      const config = configService.getConfig();

      // Create sync service
      syncService = new SyncService({ config });

      spinner.succeed('Initialization complete');
      console.log();

      // Pre-flight validation
      spinner.start('Validating GitHub access...');
      const validation = await configService.validateGitHubConfig();

      if (!validation.valid) {
        spinner.fail('GitHub configuration invalid');
        console.log();
        validation.errors.forEach((error) => {
          console.error(chalk.red(`  • ${error}`));
        });
        console.log();
        console.log(
          chalk.cyan('Tip: Run'),
          chalk.bold('pnpm dev validate'),
          chalk.cyan('to check your configuration')
        );
        syncService.close();
        process.exit(1);
      }

      spinner.succeed('GitHub access validated');
      console.log();

      // Run sync
      const summary = await syncService.sync(options, (message) => {
        console.log(chalk.cyan(message));
      });

      // Display summary
      console.log(syncService.formatSummary(summary));

      // Close database
      syncService.close();
    } catch (error) {
      spinner.fail('Sync failed');
      console.log();

      // Handle custom error types with better messages
      if (error instanceof GitHubAuthenticationError) {
        console.error(chalk.red('❌ Authentication Error'));
        console.error(chalk.yellow('  • Check your GITHUB_TOKEN in .env'));
        console.error(
          chalk.yellow('  • Generate a new token at: https://github.com/settings/tokens')
        );
      } else if (error instanceof GitHubRateLimitError) {
        console.error(chalk.red('❌ Rate Limit Exceeded'));
        console.error(chalk.yellow(`  • Resets at: ${error.resetTime.toLocaleString()}`));
        console.error(chalk.cyan('  • Try again after reset time or reduce sync scope'));
      } else if (error instanceof GitHubResourceNotFoundError) {
        console.error(chalk.red('❌ Resource Not Found'));
        console.error(chalk.yellow(`  • ${error.resourceType}: ${error.resourceId}`));
        console.error(chalk.cyan('  • Check repository/organization name'));
      } else if (error instanceof ConfigurationError) {
        console.error(chalk.red('❌ Configuration Error'));
        console.error(chalk.yellow(`  • ${error.message}`));
        if (error.configKey) {
          console.error(chalk.gray(`  • Key: ${error.configKey}`));
        }
      } else if (error instanceof DatabaseError) {
        console.error(chalk.red('❌ Database Error'));
        console.error(chalk.yellow(`  • ${error.message}`));
        if (error.operation) {
          console.error(chalk.gray(`  • Operation: ${error.operation}`));
        }
      } else if (error instanceof ValidationError) {
        console.error(chalk.red('❌ Validation Error'));
        console.error(chalk.yellow(`  • ${error.message}`));
        if (error.fields && error.fields.length > 0) {
          console.error(chalk.gray(`  • Fields: ${error.fields.join(', ')}`));
        }
      } else if (error instanceof SyncError) {
        console.error(chalk.red('❌ Sync Error'));
        console.error(chalk.yellow(`  • ${error.message}`));
        if (error.repository) {
          console.error(chalk.gray(`  • Repository: ${error.repository}`));
        }
      } else if (isAppError(error)) {
        console.error(chalk.red('❌ Error'));
        console.error(chalk.yellow(`  • ${getUserMessage(error)}`));
      } else {
        console.error(chalk.red('❌ Unexpected Error'));
        console.error(
          chalk.yellow(`  • ${error instanceof Error ? error.message : String(error)}`)
        );
      }

      // Show stack trace in debug mode
      if (error instanceof Error && error.stack && process.env.DEBUG) {
        console.log();
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }

      console.log();

      // Clean up
      if (syncService) {
        syncService.close();
      }
      process.exit(1);
    }
  });

/**
 * Stats command
 */
program
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    const configService = new ConfigService();
    const syncService = new SyncService({ config: configService.getConfig() });

    try {
      const stats = syncService.getStatistics();

      console.log(chalk.bold('\n📊 Database Statistics\n'));
      console.log(`Pull Requests: ${chalk.green(stats.pullRequests)}`);
      console.log(`Reviews:       ${chalk.green(stats.reviews)}`);
      console.log(`Comments:      ${chalk.green(stats.comments)}`);
      console.log();

      syncService.close();
    } catch (error) {
      console.log();
      if (isAppError(error)) {
        console.error(chalk.red('❌ Error:'), getUserMessage(error));
      } else {
        console.error(
          chalk.red('❌ Error:'),
          error instanceof Error ? error.message : String(error)
        );
      }
      console.log();
      syncService.close();
      process.exit(1);
    }
  });

/**
 * Check command
 */
program
  .command('check')
  .description('Show what data has been synced')
  .option('--since <date>', 'Filter by start date (days ago or YYYY-MM-DD)')
  .option('--until <date>', 'Filter by end date (YYYY-MM-DD)')
  .action(async (options: { since?: string; until?: string }) => {
    const configService = new ConfigService();
    const config = configService.getConfig();
    const syncService = new SyncService({ config });

    try {
      // Get all repositories that have been synced
      const repositories = syncService.getSyncedRepositories();

      if (repositories.length === 0) {
        console.log(chalk.yellow('\n⚠️  No data has been synced yet.\n'));
        console.log(chalk.cyan('Run:'), chalk.bold('pnpm dev sync --since 30'));
        console.log();
        syncService.close();
        return;
      }

      // Parse filter dates if provided
      let filterStartDate: Date | null = null;
      let filterEndDate: Date | null = null;

      if (options.since || options.until) {
        try {
          const parsed = syncService.parseDateRange({
            since: options.since || '0',
            until: options.until,
          });
          filterStartDate = options.since ? parsed.startDate : null;
          filterEndDate = parsed.endDate;
        } catch (error) {
          console.error(
            chalk.red(`❌ ${error instanceof Error ? error.message : 'Invalid date format'}`)
          );
          syncService.close();
          process.exit(1);
        }
      }

      if (filterStartDate || filterEndDate) {
        // Filtered view - show coverage analysis
        console.log(chalk.bold('\n📊 Synced Data Coverage'));
        if (filterStartDate && filterEndDate) {
          console.log(
            chalk.gray(
              `   For: ${formatLocalDate(filterStartDate)} to ${formatLocalDate(filterEndDate)}\n`
            )
          );
        } else if (filterStartDate) {
          console.log(chalk.gray(`   For: ${formatLocalDate(filterStartDate)} onwards\n`));
        }

        const covered: string[] = [];
        const partial: Array<{ repo: string; missing: string }> = [];
        const noCoverage: string[] = [];

        for (const repo of repositories) {
          const syncData = syncService.getRepositorySyncInfo(repo);
          const prSync = syncData.find((s) => s.resourceType === 'pull_requests');

          if (prSync && prSync.dateRangeStart && prSync.dateRangeEnd) {
            const syncStart = prSync.dateRangeStart;
            const syncEnd = prSync.dateRangeEnd;

            // Check coverage (compare as ISO date strings to avoid timezone issues)
            const coversStart =
              !filterStartDate || formatLocalDate(syncStart) <= formatLocalDate(filterStartDate);
            const coversEnd =
              !filterEndDate || formatLocalDate(syncEnd) >= formatLocalDate(filterEndDate);

            if (coversStart && coversEnd) {
              covered.push(repo);
            } else if (syncEnd >= (filterStartDate || new Date(0))) {
              // Partial coverage
              let missing = '';
              if (!coversStart && filterStartDate) {
                missing = `Missing: ${formatLocalDate(filterStartDate)} to ${formatLocalDate(syncStart)}`;
              } else if (!coversEnd && filterEndDate) {
                missing = `Missing: ${formatLocalDate(syncEnd)} to ${formatLocalDate(filterEndDate)}`;
              }
              partial.push({ repo, missing });
            } else {
              noCoverage.push(repo);
            }
          } else {
            noCoverage.push(repo);
          }
        }

        // Show covered repos
        if (covered.length > 0) {
          console.log(chalk.green.bold(`✅ FULL COVERAGE (${covered.length} repos):\n`));
          for (const repo of covered) {
            const syncData = syncService.getRepositorySyncInfo(repo);
            const prSync = syncData.find((s) => s.resourceType === 'pull_requests');
            if (prSync) {
              const startDate = formatLocalDate(prSync.dateRangeStart!);
              const endDate = formatLocalDate(prSync.dateRangeEnd!);
              console.log(
                chalk.green('  ✓'),
                chalk.bold(repo),
                chalk.gray(`(${startDate} to ${endDate})`)
              );
            }
          }
          console.log();
        }

        // Show partial coverage repos
        if (partial.length > 0) {
          console.log(chalk.yellow.bold(`⚠️  PARTIAL COVERAGE (${partial.length} repos):\n`));
          for (const { repo, missing } of partial) {
            const syncData = syncService.getRepositorySyncInfo(repo);
            const prSync = syncData.find((s) => s.resourceType === 'pull_requests');
            if (prSync) {
              const startDate = formatLocalDate(prSync.dateRangeStart!);
              const endDate = formatLocalDate(prSync.dateRangeEnd!);
              console.log(
                chalk.yellow('  ⚠️ '),
                chalk.bold(repo),
                chalk.gray(`(${startDate} to ${endDate})`)
              );
              console.log(chalk.gray(`      ${missing}`));
            }
          }
          console.log();
        }

        // Show no coverage repos (limit output)
        if (noCoverage.length > 0) {
          console.log(chalk.red.bold(`❌ NO COVERAGE (${noCoverage.length} repos)\n`));
        }

        // Show actionable commands
        if (partial.length > 0 || noCoverage.length > 0) {
          console.log(chalk.cyan('💡 To sync missing data:\n'));
          const toSync = [...partial.map((p) => p.repo), ...noCoverage].slice(0, 3);
          for (const repo of toSync) {
            const sinceArg = filterStartDate ? `--since ${formatLocalDate(filterStartDate)}` : '';
            console.log(chalk.bold(`   pnpm dev sync --repo ${repo} ${sinceArg}`));
          }
          if (partial.length + noCoverage.length > 3) {
            console.log(
              chalk.gray(`   ... and ${partial.length + noCoverage.length - 3} more repos`)
            );
          }
          console.log();
        }
      } else {
        // Default view - show all repos
        console.log(chalk.bold('\n📊 Synced Data Summary\n'));

        for (const repo of repositories) {
          const syncData = syncService.getRepositorySyncInfo(repo);
          const prSync = syncData.find((s) => s.resourceType === 'pull_requests');

          if (prSync && prSync.dateRangeStart && prSync.dateRangeEnd) {
            const startDate = formatLocalDate(prSync.dateRangeStart);
            const endDate = formatLocalDate(prSync.dateRangeEnd);
            const lastSync = prSync.lastSyncAt;
            const now = new Date();
            const hoursAgo = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60));
            const timeAgo =
              hoursAgo < 1
                ? 'just now'
                : hoursAgo < 24
                  ? `${hoursAgo}h ago`
                  : `${Math.floor(hoursAgo / 24)}d ago`;

            console.log(
              chalk.green('  ✓'),
              chalk.bold(repo),
              chalk.gray(`(${startDate} to ${endDate})`)
            );
            console.log(
              chalk.gray('    └─'),
              `${prSync.itemsSynced} PRs`,
              chalk.gray(`• synced ${timeAgo}`)
            );
          }
        }

        // Overall stats
        const stats = syncService.getStatistics();
        const totalPRs = stats.pullRequests;
        console.log();
        console.log(
          chalk.bold('Total:'),
          `${totalPRs} pull requests across ${repositories.length} repositories`
        );
        console.log();
        console.log(
          chalk.cyan('💡 Tip:'),
          'Use',
          chalk.bold('pnpm dev check --since <date>'),
          'to see coverage for a specific period'
        );
        console.log(
          chalk.cyan('       '),
          'Use',
          chalk.bold('pnpm dev report --since <date>'),
          'to generate reports'
        );
        console.log();
      }

      syncService.close();
    } catch (error) {
      console.log();
      if (isAppError(error)) {
        console.error(chalk.red('❌ Error:'), getUserMessage(error));
      } else {
        console.error(
          chalk.red('❌ Error:'),
          error instanceof Error ? error.message : String(error)
        );
      }
      console.log();
      syncService.close();
      process.exit(1);
    }
  });

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate configuration and GitHub access')
  .action(async () => {
    const spinner = ora('Validating configuration...').start();
    const configService = new ConfigService();

    try {
      const config = configService.getConfig();

      // Validate GitHub configuration
      spinner.text = 'Testing GitHub authentication...';
      const result = await configService.validateGitHubConfig();

      if (result.valid) {
        spinner.succeed(chalk.green('✅ Configuration valid!'));
        console.log();
        console.log(chalk.green('  ✓ Token:'), 'Valid');
        console.log(chalk.green('  ✓ Organization:'), config.github.organization, '(accessible)');

        if (result.details.scopes && result.details.scopes.length > 0) {
          console.log(chalk.green('  ✓ Scopes:'), result.details.scopes.join(', '));
        }

        if (result.warnings.length > 0) {
          console.log();
          console.log(chalk.yellow('⚠️  Warnings:'));
          result.warnings.forEach((warning) => console.log(chalk.yellow(`  • ${warning}`)));
        }

        console.log();
        console.log(chalk.cyan('Ready to sync! Run:'), chalk.bold('pnpm dev sync'));
        console.log();
      } else {
        spinner.fail(chalk.red('❌ Configuration invalid'));
        console.log();

        result.errors.forEach((error) => {
          console.error(chalk.red(`  • ${error}`));
        });

        console.log();
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.log();

      if (error instanceof ConfigurationError) {
        console.error(chalk.red('❌ Configuration Error'));
        console.error(chalk.yellow(`  • ${error.message}`));
      } else if (isAppError(error)) {
        console.error(chalk.red('❌ Error:'), getUserMessage(error));
      } else {
        console.error(
          chalk.red('❌ Error:'),
          error instanceof Error ? error.message : String(error)
        );
      }

      // Show stack trace in debug mode
      if (error instanceof Error && error.stack && process.env.DEBUG) {
        console.log();
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }

      console.log();
      process.exit(1);
    }
  });

/**
 * Options for report command
 */
interface ReportCommandOptions {
  since: string;
  until?: string;
  engineer?: string;
  repo?: string;
  team?: string;
  format: 'markdown' | 'json' | 'csv';
  output?: string;
  type: 'overview' | 'engineer' | 'rankings' | 'repos';
  includeBots: boolean;
  excludeUsers?: string;
}

/**
 * Report command
 */
program
  .command('report')
  .description('Generate metrics reports')
  .option(
    '-s, --since <date>',
    'Start date (ISO format or days ago, e.g., "30" for last 30 days)',
    '30'
  )
  .option('-u, --until <date>', 'End date (ISO format, defaults to end of today)')
  .option('-e, --engineer <name>', 'Generate detailed report for specific engineer')
  .option(
    '-r, --repo <repos>',
    'Filter by repository (comma-separated for multiple, e.g., "web-app,api-app-data")'
  )
  .option('--team <team>', 'Filter by team (defined in .metricsrc)')
  .option('-f, --format <format>', 'Output format: markdown, json, or csv', 'markdown')
  .option('-o, --output <file>', 'Output file (defaults to stdout)')
  .option('-t, --type <type>', 'Report type: overview, engineer, rankings, or repos', 'overview')
  .option('--include-bots', 'Include bot users in report (hidden by default)', false)
  .option('--exclude-users <users>', 'Comma-separated list of users to exclude')
  .action(async (options: ReportCommandOptions) => {
    const configService = new ConfigService();
    const config = configService.getConfig();
    const syncService = new SyncService({ config });

    try {
      // Parse dates
      const { startDate, endDate } = syncService.parseDateRange({
        since: options.since,
        until: options.until,
      });

      // Initialize database for report generation
      const db = initializeDatabase(config.database);
      applyMigrations(db, ALL_MIGRATIONS);

      // Parse repository filter (comma-separated list)
      let repositories: string[] | undefined;
      if (options.repo) {
        repositories = options.repo.split(',').map((r) => r.trim());

        // Validate repository names
        const reportGenerator = new ReportGenerator(db);
        const availableRepos = reportGenerator.getRepositories();

        const invalidRepos = repositories.filter((r) => !availableRepos.includes(r));
        if (invalidRepos.length > 0) {
          console.error(chalk.red(`❌ Invalid repository names: ${invalidRepos.join(', ')}`));
          console.log(chalk.gray('   Available repositories:'), availableRepos.join(', '));
          process.exit(1);
        }
      }

      // Parse team filter
      let teamMembers: string[] | undefined;
      let teamName: string | undefined;
      if (options.team) {
        const team = getTeam(config.teams, options.team);
        if (!team) {
          console.error(chalk.red(`❌ Team not found: ${options.team}`));
          console.log(
            chalk.gray('   Available teams:'),
            Object.keys(config.teams).join(', ') || '(none configured)'
          );
          console.log();
          console.log(chalk.cyan('💡 Add teams to your .metricsrc file'));
          console.log(chalk.gray('   See .metricsrc.example for examples'));
          process.exit(1);
        }

        teamName = team.name;
        teamMembers = getTeamMembers(config.teams, options.team);

        // If team filter is provided, also filter by team repositories (unless --repo is explicit)
        if (!options.repo) {
          const teamRepos = getTeamRepositories(config.teams, options.team);
          if (teamRepos.length > 0) {
            repositories = teamRepos;
          }
        }

        console.log(chalk.cyan(`📊 Filtering by team: ${teamName}`));
        console.log(chalk.gray(`   Members: ${teamMembers.join(', ')}`));
        if (repositories) {
          console.log(chalk.gray(`   Repositories: ${repositories.join(', ')}`));
        }
        console.log();
      }

      // Create report generator
      const reportGenerator = new ReportGenerator(db);

      // Check if data exists for requested date range
      const coverage = reportGenerator.checkDataCoverage(
        config.github.organization,
        { start: startDate, end: endDate },
        repositories?.[0]
      );

      if (!coverage.hasCoverage) {
        console.log();
        console.log(chalk.yellow('⚠️  Warning: No synced data found for requested date range'));
        console.log();
        console.log(
          chalk.gray('  Requested:'),
          `${formatLocalDate(startDate)} to ${formatLocalDate(endDate)}`
        );

        if (repositories) {
          console.log(
            chalk.gray('  Repositories:'),
            repositories.length === 1 ? repositories[0] : repositories.join(', ')
          );
        }

        console.log();
        console.log(chalk.cyan('💡 Sync data first with:'));

        if (options.repo) {
          console.log(
            chalk.bold(
              `   pnpm dev sync --repo ${options.repo} --since ${formatLocalDate(startDate)} --until ${formatLocalDate(endDate)}`
            )
          );
        } else {
          console.log(
            chalk.bold(
              `   pnpm dev sync --since ${formatLocalDate(startDate)} --until ${formatLocalDate(endDate)}`
            )
          );
        }

        console.log();
        console.log(
          chalk.gray('Or use'),
          chalk.bold('pnpm dev check'),
          chalk.gray('to see available data')
        );
        console.log();

        db.close();
        syncService.close();
        process.exit(1);
      }

      // Show coverage info if partial
      if (coverage.syncedRanges.length > 0 && !options.repo) {
        const totalRepos = reportGenerator.getRepositories().length;
        const syncedRepos = coverage.syncedRanges.length;

        if (syncedRepos < totalRepos) {
          console.log();
          console.log(
            chalk.yellow(
              `⚠️  Partial coverage: ${syncedRepos}/${totalRepos} repositories have synced data for this period`
            )
          );
          console.log();
        }
      }

      // Parse excluded users
      let excludedUsers = options.excludeUsers
        ? options.excludeUsers.split(',').map((u) => u.trim())
        : config.reports.excludedUsers;

      // If team filter is active, add all non-team members to excluded users
      if (teamMembers && teamMembers.length > 0) {
        const allEngineers = reportGenerator.getEngineers();
        const nonTeamMembers = allEngineers.filter((engineer) => !teamMembers.includes(engineer));
        excludedUsers = [...excludedUsers, ...nonTeamMembers];
      }

      // Generate report based on type
      let reportContent: string;

      if (options.type === 'engineer' || options.engineer) {
        if (!options.engineer) {
          console.error(chalk.red('❌ --engineer required for engineer report'));
          console.log();
          console.log(chalk.cyan('Tip:'), 'Use --engineer <name> to specify an engineer');
          console.log();
          process.exit(1);
        }

        // Generate detailed engineer report
        const detailReport = reportGenerator.generateEngineerDetailReport({
          organization: config.github.organization,
          dateRange: { start: startDate, end: endDate },
          engineer: options.engineer,
          repositories,
          includeBots: options.includeBots,
          excludedUsers,
          teams: config.teams,
        });

        if (options.format === 'json') {
          reportContent = formatEngineerDetailJSON(detailReport);
        } else if (options.format === 'csv') {
          reportContent = formatEngineerDetailCSV(detailReport);
        } else {
          reportContent = formatEngineerDetailReport(detailReport, repositories);
        }
      } else if (options.type === 'rankings') {
        const metrics = reportGenerator.generateOrganizationReport({
          organization: config.github.organization,
          dateRange: { start: startDate, end: endDate },
          repositories,
          includeBots: options.includeBots,
          excludedUsers,
        });

        reportContent =
          options.format === 'json' ? formatOrganizationJSON(metrics) : formatTeamRankings(metrics);
      } else if (options.type === 'repos') {
        // Repository health report
        const healthReport = reportGenerator.generateRepositoryHealthReport({
          organization: config.github.organization,
          dateRange: { start: startDate, end: endDate },
          repositories,
          includeBots: options.includeBots,
          excludedUsers,
        });

        reportContent = formatRepositoryHealthReport(healthReport);
      } else {
        // overview (default)
        const metrics = reportGenerator.generateOrganizationReport({
          organization: config.github.organization,
          dateRange: { start: startDate, end: endDate },
          repositories,
          includeBots: options.includeBots,
          excludedUsers,
        });

        reportContent =
          options.format === 'json'
            ? formatOrganizationJSON(metrics)
            : formatOrganizationReport(metrics, repositories);
      }

      // Output to file or stdout
      if (options.output) {
        writeFileSync(options.output, reportContent, 'utf-8');
        console.log(chalk.green(`✅ Report saved to ${options.output}`));
      } else {
        console.log(reportContent);
      }

      db.close();
      syncService.close();
    } catch (error) {
      console.log();
      if (isAppError(error)) {
        console.error(chalk.red('❌ Error:'), getUserMessage(error));
      } else {
        console.error(
          chalk.red('❌ Error:'),
          error instanceof Error ? error.message : String(error)
        );
      }

      // Show stack trace in debug mode
      if (error instanceof Error && error.stack && process.env.DEBUG) {
        console.log();
        console.error(chalk.gray('Stack trace:'));
        console.error(chalk.gray(error.stack));
      }

      console.log();
      syncService.close();
      process.exit(1);
    }
  });

/**
 * Serve command - Start web UI
 */
program
  .command('serve')
  .description('Start the web UI server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options: { port: string; open: boolean }) => {
    const { startServer } = await import('../web/server/index');

    await startServer({
      port: parseInt(options.port, 10),
      openBrowser: options.open,
    });
  });

program.parse();

export {};
