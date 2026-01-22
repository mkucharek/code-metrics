/**
 * Metrics API Routes
 * Endpoints for retrieving metrics data
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { ServerContext } from '../index';
import { ValidationError } from '../../../../domain/errors';
import { parseLocalDate, parseLocalDateEndOfDay, getDaysAgo } from '../../../../domain/utils/dates';
import { formatEngineerDetailReport } from '../../../formatters';

/**
 * Query params schema for date filtering
 */
const DateQuerySchema = z.object({
  since: z.string().optional().default('30'),
  until: z.string().optional(),
  team: z.string().optional(),
  repositories: z.string().optional(),
});

/**
 * Parse date query params into DateRange
 */
function parseDateQuery(query: z.infer<typeof DateQuerySchema>) {
  const since = query.since ?? '30';
  let start: Date;
  let end: Date;

  if (since.match(/^\d+$/)) {
    start = getDaysAgo(parseInt(since, 10));
  } else {
    start = parseLocalDate(since);
  }

  end = query.until ? parseLocalDateEndOfDay(query.until) : new Date();

  return { start, end };
}

/**
 * Create metrics routes
 */
export function metricsRoutes(ctx: ServerContext): Hono {
  const app = new Hono();

  /**
   * GET /api/metrics/organization
   * Get organization-wide metrics
   */
  app.get('/organization', (c) => {
    const rawQuery = {
      since: c.req.query('since') ?? '30',
      until: c.req.query('until'),
      team: c.req.query('team'),
      repositories: c.req.query('repositories'),
    };

    const query = DateQuerySchema.parse(rawQuery);
    const dateRange = parseDateQuery(query);

    // Get team members if team filter is specified
    let teamMembers: string[] | undefined;
    if (query.team) {
      const team = ctx.config.teams[query.team];
      if (team) {
        teamMembers = team.members;
      }
    }

    // Parse repositories filter
    const repositories = query.repositories?.split(',').filter(Boolean);

    const metrics = ctx.reportGenerator.generateOrganizationReport({
      organization: ctx.config.github.organization || '',
      dateRange,
      repositories,
      excludedUsers: ctx.config.reports.excludedUsers,
      teams: ctx.config.teams,
    });

    // If team filter, filter engineers
    if (teamMembers && teamMembers.length > 0) {
      const filteredEngineers = metrics.engineers.filter((e) => teamMembers.includes(e.engineer));
      return c.json({
        ...metrics,
        engineers: filteredEngineers,
        engineerCount: filteredEngineers.length,
      });
    }

    return c.json(metrics);
  });

  /**
   * GET /api/metrics/engineer/:username
   * Get detailed metrics for a specific engineer
   */
  app.get('/engineer/:username', (c) => {
    const username = c.req.param('username');
    const rawQuery = {
      since: c.req.query('since') ?? '30',
      until: c.req.query('until'),
      repositories: c.req.query('repositories'),
    };

    const query = DateQuerySchema.parse(rawQuery);
    const dateRange = parseDateQuery(query);
    const repositories = query.repositories?.split(',').filter(Boolean);

    // Check if engineer exists
    const engineers = ctx.reportGenerator.getEngineers();
    if (!engineers.includes(username)) {
      throw new ValidationError(`Engineer not found: ${username}`, ['username']);
    }

    const report = ctx.reportGenerator.generateEngineerDetailReport({
      organization: ctx.config.github.organization || '',
      dateRange,
      engineer: username,
      repositories,
      excludedUsers: ctx.config.reports.excludedUsers,
      teams: ctx.config.teams,
    });

    return c.json(report);
  });

  /**
   * GET /api/metrics/engineer/:username/export/markdown
   * Export engineer report as markdown file
   */
  app.get('/engineer/:username/export/markdown', (c) => {
    const username = c.req.param('username');
    const rawQuery = {
      since: c.req.query('since') ?? '30',
      until: c.req.query('until'),
      repositories: c.req.query('repositories'),
    };

    const query = DateQuerySchema.parse(rawQuery);
    const dateRange = parseDateQuery(query);
    const repositories = query.repositories?.split(',').filter(Boolean);

    const engineers = ctx.reportGenerator.getEngineers();
    if (!engineers.includes(username)) {
      throw new ValidationError(`Engineer not found: ${username}`, ['username']);
    }

    const report = ctx.reportGenerator.generateEngineerDetailReport({
      organization: ctx.config.github.organization || '',
      dateRange,
      engineer: username,
      repositories,
      excludedUsers: ctx.config.reports.excludedUsers,
      teams: ctx.config.teams,
    });

    const markdown = formatEngineerDetailReport(report, repositories);
    const filename = `${username}-report-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.md`;

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });

  /**
   * GET /api/metrics/repositories
   * Get repository health metrics
   */
  app.get('/repositories', (c) => {
    const rawQuery = {
      since: c.req.query('since') ?? '30',
      until: c.req.query('until'),
      repositories: c.req.query('repositories'),
    };

    const query = DateQuerySchema.parse(rawQuery);
    const dateRange = parseDateQuery(query);
    const repositories = query.repositories?.split(',').filter(Boolean);

    const report = ctx.reportGenerator.generateRepositoryHealthReport({
      organization: ctx.config.github.organization || '',
      dateRange,
      repositories,
      excludedUsers: ctx.config.reports.excludedUsers,
      teams: ctx.config.teams,
    });

    return c.json(report);
  });

  return app;
}
