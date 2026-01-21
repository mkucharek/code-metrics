/**
 * Data API Routes
 * Endpoints for retrieving reference data (engineers, repos, teams)
 */

import { Hono } from 'hono';
import type { ServerContext } from '../index';

/**
 * Create data routes
 */
export function dataRoutes(ctx: ServerContext): Hono {
  const app = new Hono();

  /**
   * GET /api/engineers
   * Get list of all engineers in the database
   */
  app.get('/engineers', (c) => {
    const engineers = ctx.reportGenerator.getEngineers();
    const excludedUsers = ctx.config.reports.excludedUsers;

    // Filter out excluded users
    const filtered = engineers.filter((e) => !excludedUsers.includes(e));

    return c.json({
      engineers: filtered.map((username) => {
        // Find team membership
        const teams: string[] = [];
        for (const [teamId, team] of Object.entries(ctx.config.teams)) {
          if (team.members.includes(username)) {
            teams.push(teamId);
          }
        }

        return {
          username,
          teams,
        };
      }),
      total: filtered.length,
    });
  });

  /**
   * GET /api/repositories
   * Get list of all repositories in the database
   */
  app.get('/repositories', (c) => {
    const repositories = ctx.reportGenerator.getRepositories();

    return c.json({
      repositories: repositories.map((name) => {
        // Find team ownership
        const teams: string[] = [];
        for (const [teamId, team] of Object.entries(ctx.config.teams)) {
          if (team.repositories.includes(name)) {
            teams.push(teamId);
          }
        }

        return {
          name,
          teams,
        };
      }),
      total: repositories.length,
    });
  });

  /**
   * GET /api/teams
   * Get configured teams from config
   */
  app.get('/teams', (c) => {
    const teams = Object.entries(ctx.config.teams).map(([id, team]) => ({
      id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length,
      repositoryCount: team.repositories.length,
    }));

    return c.json({
      teams,
      total: teams.length,
    });
  });

  /**
   * GET /api/teams/:teamId
   * Get details for a specific team
   */
  app.get('/teams/:teamId', (c) => {
    const teamId = c.req.param('teamId');
    const team = ctx.config.teams[teamId];

    if (!team) {
      return c.json({ error: `Team not found: ${teamId}` }, 404);
    }

    return c.json({
      id: teamId,
      ...team,
    });
  });

  /**
   * GET /api/config
   * Get non-sensitive config information
   */
  app.get('/config', (c) => {
    return c.json({
      organization: ctx.config.github.organization,
      defaultDateRange: ctx.config.reports.defaultDateRange,
      excludedUsers: ctx.config.reports.excludedUsers,
      teamCount: Object.keys(ctx.config.teams).length,
    });
  });

  return app;
}
