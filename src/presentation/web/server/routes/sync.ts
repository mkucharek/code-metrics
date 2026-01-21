/**
 * Sync API Routes
 * Endpoints for managing data synchronization
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { ServerContext } from '../index';
import { ValidationError } from '../../../../domain/errors';

/**
 * Sync job status
 */
interface SyncJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  /** Sync parameters */
  params: {
    since: string;
    until?: string;
    repository?: string;
    force: boolean;
  };
  progress: {
    message: string;
    phase: 'initializing' | 'fetching_repos' | 'syncing' | 'completed' | 'failed';
    repository?: string;
    processed?: number;
    total?: number;
    /** Current repo stats being synced */
    currentRepoStats?: {
      prs?: number;
      reviews?: number;
      comments?: number;
      commits?: number;
    };
    /** API quota info */
    apiQuota?: {
      remaining: number;
      limit: number;
      resetTime?: string;
    };
  };
  /** Activity log (last 50 messages) */
  activityLog: Array<{
    timestamp: Date;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  result?: {
    repositoriesProcessed: number;
    pullRequestsProcessed: number;
    reviewsProcessed: number;
    commentsProcessed: number;
    commitsProcessed: number;
  };
  error?: string;
}

// In-memory job store (simple for now)
const syncJobs = new Map<string, SyncJob>();

/**
 * Sync request schema
 */
const SyncRequestSchema = z.object({
  since: z.string().default('30'),
  until: z.string().optional(),
  repository: z.string().optional(),
  excludeRepositories: z.array(z.string()).optional(),
  force: z.boolean().default(false),
});

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create sync routes
 */
export function syncRoutes(ctx: ServerContext): Hono {
  const app = new Hono();

  /**
   * GET /api/sync/status
   * Get current sync status and data coverage
   */
  app.get('/status', (c) => {
    // Get database statistics
    const stats = ctx.syncService.getStatistics();

    // Get synced repositories and their info
    const syncedRepos = ctx.syncService.getSyncedRepositories();
    const syncedRanges: Array<{
      repository: string;
      start: string;
      end: string;
      lastSyncAt: string;
    }> = [];

    for (const repo of syncedRepos) {
      const info = ctx.syncService.getRepositorySyncInfo(repo);
      const prSync = info.find((i) => i.resourceType === 'pull_requests');
      if (prSync && prSync.dateRangeStart && prSync.dateRangeEnd) {
        syncedRanges.push({
          repository: repo,
          start: prSync.dateRangeStart.toISOString().split('T')[0] ?? '',
          end: prSync.dateRangeEnd.toISOString().split('T')[0] ?? '',
          lastSyncAt: prSync.lastSyncAt.toISOString(),
        });
      }
    }

    // Get running jobs
    const runningJobs = Array.from(syncJobs.values()).filter((j) => j.status === 'running');

    // Has coverage if we have any data
    const hasCoverage = stats.pullRequests > 0;

    return c.json({
      hasCoverage,
      statistics: stats,
      syncedRepositories: syncedRepos.length,
      syncedRanges,
      isRunning: runningJobs.length > 0,
      runningJobId: runningJobs[0]?.id,
    });
  });

  /**
   * POST /api/sync/start
   * Start a new sync job
   */
  app.post('/start', async (c) => {
    // Check if sync is already running
    const runningJobs = Array.from(syncJobs.values()).filter((j) => j.status === 'running');
    if (runningJobs.length > 0 && runningJobs[0]) {
      return c.json(
        {
          error: 'Sync already in progress',
          jobId: runningJobs[0].id,
        },
        409
      );
    }

    // Parse request body
    let body: z.infer<typeof SyncRequestSchema>;
    try {
      const rawBody: unknown = await c.req.json();
      body = SyncRequestSchema.parse(rawBody);
    } catch {
      throw new ValidationError('Invalid sync request', ['body']);
    }

    // Create job
    const jobId = generateJobId();
    const job: SyncJob = {
      id: jobId,
      status: 'pending',
      startedAt: new Date(),
      params: {
        since: body.since,
        until: body.until,
        repository: body.repository,
        force: body.force ?? false,
      },
      progress: {
        message: 'Initializing...',
        phase: 'initializing',
      },
      activityLog: [],
    };
    syncJobs.set(jobId, job);

    /** Add message to activity log (keeps last 50) */
    const addToLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      job.activityLog.push({ timestamp: new Date(), message, type });
      if (job.activityLog.length > 50) {
        job.activityLog.shift();
      }
    };

    // Start sync in background
    (async () => {
      job.status = 'running';
      job.progress.message = 'Starting sync...';

      try {
        const summary = await ctx.syncService.sync(
          {
            since: body.since ?? '30',
            until: body.until,
            repo: body.repository,
            excludeRepo: body.excludeRepositories?.join(','),
            force: body.force ?? false,
          },
          (message) => {
            job.progress.message = message;

            // Determine message type for logging
            let msgType: 'info' | 'success' | 'warning' | 'error' = 'info';
            if (message.includes('✓') || message.includes('completed')) {
              msgType = 'success';
            } else if (
              message.includes('✗') ||
              message.includes('Error') ||
              message.includes('⛔')
            ) {
              msgType = 'error';
            } else if (message.includes('⏭️') || message.includes('skipped')) {
              msgType = 'warning';
            }

            // Add to activity log (skip empty/whitespace-only messages)
            if (message.trim()) {
              addToLog(message.trim(), msgType);
            }

            // Parse phase from message
            if (message.includes('Fetching repositories')) {
              job.progress.phase = 'fetching_repos';
            } else if (message.includes('Syncing:') || message.match(/\[\d+\/\d+\]/)) {
              job.progress.phase = 'syncing';
            }

            // Parse repository progress: [X/Y] Syncing repo-name...
            const repoMatch = message.match(/\[(\d+)\/(\d+)\]\s+Syncing\s+(.+?)\.\.\./);
            if (repoMatch) {
              job.progress.processed = parseInt(repoMatch[1] ?? '0', 10);
              job.progress.total = parseInt(repoMatch[2] ?? '0', 10);
              job.progress.repository = repoMatch[3];
              // Reset current repo stats
              job.progress.currentRepoStats = {};
            }

            // Parse found counts
            const foundPRs = message.match(/Found (\d+) pull requests/);
            if (foundPRs && job.progress.currentRepoStats) {
              job.progress.currentRepoStats.prs = parseInt(foundPRs[1] ?? '0', 10);
            }

            // Parse repo completion: ✓ repo: X PRs, Y reviews, Z comments, W commits
            const repoComplete = message.match(
              /✓\s+[\w-]+:\s+(\d+)\s+PRs?,\s+(\d+)\s+reviews?,\s+(\d+)\s+comments?,\s+(\d+)\s+commits?/
            );
            if (repoComplete && job.progress.currentRepoStats) {
              job.progress.currentRepoStats.prs = parseInt(repoComplete[1] ?? '0', 10);
              job.progress.currentRepoStats.reviews = parseInt(repoComplete[2] ?? '0', 10);
              job.progress.currentRepoStats.comments = parseInt(repoComplete[3] ?? '0', 10);
              job.progress.currentRepoStats.commits = parseInt(repoComplete[4] ?? '0', 10);
            }

            // Parse API quota: Quota: X/Y remaining
            const quotaMatch = message.match(/Quota:\s+(\d+)\/(\d+)\s+remaining/);
            if (quotaMatch) {
              job.progress.apiQuota = {
                remaining: parseInt(quotaMatch[1] ?? '0', 10),
                limit: parseInt(quotaMatch[2] ?? '0', 10),
              };
            }

            // Parse initial API quota: GitHub API: X/Y requests remaining (resets in Z min)
            const initialQuota = message.match(/GitHub API:\s+(\d+)\/(\d+)\s+requests remaining/);
            if (initialQuota) {
              job.progress.apiQuota = {
                remaining: parseInt(initialQuota[1] ?? '0', 10),
                limit: parseInt(initialQuota[2] ?? '0', 10),
              };
            }
          }
        );

        job.status = 'completed';
        job.completedAt = new Date();
        job.progress.phase = 'completed';
        job.result = {
          repositoriesProcessed: summary.repoCount,
          pullRequestsProcessed: summary.prsFetched,
          reviewsProcessed: summary.reviewsFetched,
          commentsProcessed: summary.commentsFetched,
          commitsProcessed: summary.commitsFetched,
        };
        job.progress.message = 'Sync completed';
        addToLog(
          `✓ Sync completed: ${summary.repoCount} repos, ${summary.prsFetched} PRs, ${summary.reviewsFetched} reviews`,
          'success'
        );
      } catch (error) {
        job.status = 'failed';
        job.completedAt = new Date();
        job.progress.phase = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.progress.message = 'Sync failed';
        addToLog(`✗ Sync failed: ${job.error}`, 'error');
      }
    })();

    return c.json({ jobId, status: 'started' }, 202);
  });

  /**
   * GET /api/sync/progress/:jobId
   * Get progress of a sync job
   */
  app.get('/progress/:jobId', (c) => {
    const jobId = c.req.param('jobId');
    const job = syncJobs.get(jobId);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({
      id: job.id,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      params: job.params,
      progress: job.progress,
      activityLog: job.activityLog.map((entry) => ({
        timestamp: entry.timestamp.toISOString(),
        message: entry.message,
        type: entry.type,
      })),
      result: job.result,
      error: job.error,
    });
  });

  /**
   * DELETE /api/sync/cancel/:jobId
   * Cancel a running sync job (not fully implemented - just marks as cancelled)
   */
  app.delete('/cancel/:jobId', (c) => {
    const jobId = c.req.param('jobId');
    const job = syncJobs.get(jobId);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    if (job.status !== 'running') {
      return c.json({ error: 'Job is not running' }, 400);
    }

    // Note: actual cancellation requires SyncService support
    job.status = 'failed';
    job.completedAt = new Date();
    job.error = 'Cancelled by user';
    job.progress.message = 'Cancelled';

    return c.json({ status: 'cancelled' });
  });

  /**
   * GET /api/sync/jobs
   * Get list of recent sync jobs with full details
   */
  app.get('/jobs', (c) => {
    const jobs = Array.from(syncJobs.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10)
      .map((job) => ({
        id: job.id,
        status: job.status,
        startedAt: job.startedAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        params: job.params,
        progress: job.progress,
        activityLog: job.activityLog.map((entry) => ({
          timestamp: entry.timestamp.toISOString(),
          message: entry.message,
          type: entry.type,
        })),
        result: job.result,
        error: job.error,
      }));

    return c.json({ jobs });
  });

  return app;
}
