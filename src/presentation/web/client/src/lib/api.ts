/**
 * API Client
 * Functions for fetching data from the backend
 */

const API_BASE = '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Types based on backend models
export interface EngineerMetrics {
  engineer: string;
  dateRange: { start: string; end: string };
  prsCreated: number;
  reviewsGiven: number;
  linesAdded: number;
  linesDeleted: number;
  netLines: number;
  totalLinesChanged: number;
  commentsCreated: number;
  avgPRSize: number;
  prsMerged: number;
  mergeRate: number;
  repositories: string[];
}

export interface OrganizationMetrics {
  organization: string;
  dateRange: { start: string; end: string };
  engineerCount: number;
  engineers: EngineerMetrics[];
  totalPRsCreated: number;
  totalReviewsGiven: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalCommentsCreated: number;
  avgPRSize: number;
  totalPRsMerged: number;
  mergeRate: number;
  repositories: string[];
}

export interface DailyContribution {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  // Legacy fields for backward compat
  prsOpened?: number;
  prsReviewed?: number;
  comments?: number;
}

export interface PRDetail {
  weekNumber: string;
  repository: string;
  prNumber: number;
  title: string;
  status: 'open' | 'closed' | 'merged';
  linesAdded: number;
  linesDeleted: number;
  reviews: number;
  comments: number;
  timeToMerge: string;
  changedFiles: number;
  commits: number;
  createdAt: string;
  // Legacy aliases
  number?: number;
  state?: 'open' | 'closed' | 'merged';
  additions?: number;
  deletions?: number;
  mergedAt?: string;
}

export interface CommitDetail {
  date: string;
  sha: string;
  fullSha: string;
  message: string;
  repository: string;
  additions: number;
  deletions: number;
  prNumber: number | null;
}

export interface WeeklyActivity {
  weekNumber: string;
  weekStart: string;
  prsOpened: number;
  prsMerged: number;
  reviewsGiven: number;
  commentsWritten: number;
  avgPrSize: number;
  smallPRs: number;
  mediumPRs: number;
  largePRs: number;
}

export interface EngineerDetailReport {
  engineer: string;
  organization: string;
  dateRange: { start: string; end: string };
  summary: {
    avgPRsPerWeek: number;
    mostProductiveDay: string;
    busiestWeek: string;
    totalWeeks: number;
    activeDays: number;
  };
  activity: {
    prsOpened: number;
    prsMerged: number;
    prsClosed: number;
    linesAdded: number;
    linesDeleted: number;
    totalChurn: number;
    avgPrSize: number;
    mergeRate: number;
    prSizeDistribution: Record<string, number>;
  };
  commits: {
    totalCommits: number;
    linesAdded: number;
    linesDeleted: number;
    avgCommitSize: number;
    avgCommitsPerDay: number;
  };
  reviews: {
    prsReviewed: number;
    commentsMade: number;
    avgCommentsPerReview: number;
  };
  turnaround: {
    timeToFirstReview: { median: number; p75: number; p95: number };
    timeToApproval: { median: number; p75: number; p95: number };
    timeToMerge: { median: number; p75: number; p95: number };
  };
  collaboration: {
    topReviewers: { engineer: string; count: number; isCrossTeam?: boolean; team?: string }[];
    topReviewedEngineers: {
      engineer: string;
      count: number;
      isCrossTeam?: boolean;
      team?: string;
    }[];
    crossTeamCollaboration: number;
    reviewDistribution?: { totalReviewers: number; reviewConcentration: number };
  };
  repositories: { repository: string; prCount: number; linesAdded: number; linesDeleted: number }[];
  timeline: WeeklyActivity[];
  prs: PRDetail[];
  commitsList: CommitDetail[];
  contributionHeatmap: DailyContribution[];
  codeContributionHeatmap: DailyContribution[];
  codeImpactHeatmap: DailyContribution[];
}

export interface Engineer {
  username: string;
  teams: string[];
}

export interface Repository {
  name: string;
  teams: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  repositoryCount: number;
}

export interface SyncStatus {
  hasCoverage: boolean;
  statistics: {
    pullRequests: number;
    reviews: number;
    comments: number;
  };
  syncedRepositories: number;
  syncedRanges: { repository: string; start: string; end: string; lastSyncAt: string }[];
  isRunning: boolean;
  runningJobId?: string;
}

export interface SyncJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  params?: {
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
    currentRepoStats?: {
      prs?: number;
      reviews?: number;
      comments?: number;
      commits?: number;
    };
    apiQuota?: {
      remaining: number;
      limit: number;
      resetTime?: string;
    };
  };
  activityLog: Array<{
    timestamp: string;
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

// API functions
export const api = {
  // Metrics
  getOrganizationMetrics: (params?: { since?: string; until?: string; team?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.since) searchParams.set('since', params.since);
    if (params?.until) searchParams.set('until', params.until);
    if (params?.team) searchParams.set('team', params.team);
    const query = searchParams.toString();
    return fetchJson<OrganizationMetrics>(`/metrics/organization${query ? `?${query}` : ''}`);
  },

  getEngineerMetrics: (username: string, params?: { since?: string; until?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.since) searchParams.set('since', params.since);
    if (params?.until) searchParams.set('until', params.until);
    const query = searchParams.toString();
    return fetchJson<EngineerDetailReport>(
      `/metrics/engineer/${encodeURIComponent(username)}${query ? `?${query}` : ''}`
    );
  },

  getEngineerReportMarkdown: async (
    username: string,
    params?: { since?: string; until?: string }
  ): Promise<Blob> => {
    const searchParams = new URLSearchParams();
    if (params?.since) searchParams.set('since', params.since);
    if (params?.until) searchParams.set('until', params.until);
    const query = searchParams.toString();
    const response = await fetch(
      `${API_BASE}/metrics/engineer/${encodeURIComponent(username)}/export/markdown${query ? `?${query}` : ''}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.blob();
  },

  // Data
  getEngineers: () => fetchJson<{ engineers: Engineer[]; total: number }>('/engineers'),

  getRepositories: () => fetchJson<{ repositories: Repository[]; total: number }>('/repositories'),

  getTeams: () => fetchJson<{ teams: Team[]; total: number }>('/teams'),

  getConfig: () =>
    fetchJson<{
      organization: string;
      defaultDateRange: string;
      excludedUsers: string[];
      teamCount: number;
    }>('/config'),

  // Sync
  getSyncStatus: () => fetchJson<SyncStatus>('/sync/status'),

  startSync: (params?: { since?: string; until?: string; repository?: string; force?: boolean }) =>
    postJson<{ jobId: string; status: string }>('/sync/start', params),

  getSyncProgress: (jobId: string) => fetchJson<SyncJob>(`/sync/progress/${jobId}`),

  getSyncJobs: () => fetchJson<{ jobs: SyncJob[] }>('/sync/jobs'),
};
