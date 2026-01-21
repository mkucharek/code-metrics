/**
 * Web Server
 * Hono-based API server for metrics web UI
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

import { ConfigService, ReportGenerator, SyncService } from '../../../application';
import { initializeDatabase } from '../../../infrastructure/storage/database';
import { applyMigrations, ALL_MIGRATIONS } from '../../../infrastructure/storage/migrations';
import { isAppError, getUserMessage } from '../../../domain/errors';
import type { AppConfig } from '../../../infrastructure/config/schema';
import type { Database } from 'better-sqlite3';

import { metricsRoutes } from './routes/metrics';
import { dataRoutes } from './routes/data';
import { syncRoutes } from './routes/sync';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port?: number;
  openBrowser?: boolean;
}

export interface ServerContext {
  config: AppConfig;
  db: Database;
  reportGenerator: ReportGenerator;
  syncService: SyncService;
}

/**
 * Create and configure the Hono app
 */
export function createApp(ctx: ServerContext): Hono {
  const app = new Hono();

  // CORS for development
  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    })
  );

  // Health check
  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Mount route groups
  app.route('/api/metrics', metricsRoutes(ctx));
  app.route('/api', dataRoutes(ctx));
  app.route('/api/sync', syncRoutes(ctx));

  // Error handling middleware
  app.onError((err, c) => {
    console.error('Server error:', err);

    if (isAppError(err)) {
      return c.json(
        {
          error: getUserMessage(err),
          code: err.code,
        },
        err.statusCode as 400 | 404 | 500
      );
    }

    return c.json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500
    );
  });

  // Serve static files in production
  const clientDistPath = join(__dirname, '../client/dist');
  if (existsSync(clientDistPath)) {
    app.use('/*', serveStatic({ root: clientDistPath }));

    // SPA fallback - serve index.html for client-side routes
    app.get('*', (c) => {
      const indexPath = join(clientDistPath, 'index.html');
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, 'utf-8');
        return c.html(html);
      }
      return c.notFound();
    });
  }

  return app;
}

/**
 * Start the web server
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  const { port = 3000, openBrowser = true } = options;

  // Initialize services
  const configService = new ConfigService();
  const config = configService.getConfig();

  const db = initializeDatabase(config.database);
  applyMigrations(db, ALL_MIGRATIONS);

  const reportGenerator = new ReportGenerator(db);
  const syncService = new SyncService({ config });

  const ctx: ServerContext = {
    config,
    db,
    reportGenerator,
    syncService,
  };

  const app = createApp(ctx);

  console.log(`Starting server on http://localhost:${port}`);

  serve({
    fetch: app.fetch,
    port,
  });

  // Open browser if requested
  if (openBrowser) {
    const open = await import('open').then((m) => m.default).catch(() => null);
    if (open) {
      await open(`http://localhost:${port}`);
    }
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
  });
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
