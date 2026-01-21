import { useState } from 'react';
import { useSyncStatus, useSyncProgress, useStartSync, useSyncJobs } from '../hooks/useSync';
import { useConfig, useRepositories } from '../hooks/useMetrics';

export function Settings() {
  const [syncDays, setSyncDays] = useState('30');
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const { data: config } = useConfig();
  const { data: repos } = useRepositories();
  const { data: syncStatus, isLoading: statusLoading } = useSyncStatus();
  const { data: syncJobs, refetch: refetchJobs } = useSyncJobs();
  const { mutate: startSync, isPending: isSyncing } = useStartSync();

  // Get progress for running job - use activeJobId (from mutation) or syncStatus.runningJobId
  const runningJobId = activeJobId || syncStatus?.runningJobId;
  const { data: progress } = useSyncProgress(runningJobId);

  // Clear activeJobId when job completes
  const isJobRunning = progress?.status === 'running' || progress?.status === 'pending';
  if (activeJobId && !isJobRunning && progress?.status) {
    setActiveJobId(null);
    refetchJobs();
  }

  const handleStartSync = () => {
    startSync(
      {
        since: syncDays,
        repository: selectedRepo || undefined,
        force: false,
      },
      {
        onSuccess: (data) => {
          setActiveJobId(data.jobId);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage sync and configuration</p>
      </div>

      {/* Organization info */}
      {config && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">{config.organization}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Teams</dt>
              <dd className="text-sm font-medium text-gray-900">{config.teamCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Default Date Range</dt>
              <dd className="text-sm font-medium text-gray-900">{config.defaultDateRange}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Excluded Users</dt>
              <dd className="text-sm font-medium text-gray-900">
                {config.excludedUsers.length > 0 ? config.excludedUsers.join(', ') : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Sync status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>

        {statusLoading ? (
          <div className="text-gray-500">Loading status…</div>
        ) : syncStatus ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  syncStatus.hasCoverage ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span className="text-sm text-gray-700">
                {syncStatus.hasCoverage ? 'Data synced' : 'No data synced'}
              </span>
            </div>

            {/* Database statistics */}
            {syncStatus.hasCoverage && (
              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {syncStatus.statistics.pullRequests.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Pull Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {syncStatus.statistics.reviews.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">
                    {syncStatus.statistics.comments.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Comments</div>
                </div>
              </div>
            )}

            {syncStatus.syncedRanges.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-2">
                  Synced repositories ({syncStatus.syncedRepositories}):
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded max-h-40 overflow-y-auto">
                  {syncStatus.syncedRanges.map((range, i) => (
                    <div
                      key={i}
                      className="flex justify-between py-1 border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{range.repository}</span>
                      <span className="text-gray-500">
                        {range.start} to {range.end}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Sync controls */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Sync</h2>

        {syncStatus?.isRunning ||
        activeJobId ||
        progress?.status === 'running' ||
        progress?.status === 'pending' ? (
          <div className="space-y-4">
            {/* Header with phase indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {progress?.progress.phase === 'initializing' && 'Initializing…'}
                    {progress?.progress.phase === 'fetching_repos' && 'Fetching repositories…'}
                    {progress?.progress.phase === 'syncing' && 'Syncing data…'}
                    {!progress?.progress.phase && 'Sync in progress…'}
                  </span>
                  {progress?.progress.repository && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Current: <span className="font-mono">{progress.progress.repository}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* API quota indicator */}
              {progress?.progress.apiQuota && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">API Quota</div>
                  <div className="text-sm font-medium text-gray-700">
                    {progress.progress.apiQuota.remaining.toLocaleString()} /{' '}
                    {progress.progress.apiQuota.limit.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Repository progress */}
            {progress?.progress.total && progress.progress.total > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Repository progress</span>
                  <span className="font-medium text-gray-900">
                    {progress.progress.processed || 0} / {progress.progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${((progress.progress.processed || 0) / progress.progress.total) * 100}%`,
                    }}
                  />
                </div>
                {/* Current repo stats */}
                {progress.progress.currentRepoStats && (
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {progress.progress.currentRepoStats.prs ?? '-'}
                      </div>
                      <div className="text-xs text-gray-500">PRs</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {progress.progress.currentRepoStats.reviews ?? '-'}
                      </div>
                      <div className="text-xs text-gray-500">Reviews</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {progress.progress.currentRepoStats.comments ?? '-'}
                      </div>
                      <div className="text-xs text-gray-500">Comments</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {progress.progress.currentRepoStats.commits ?? '-'}
                      </div>
                      <div className="text-xs text-gray-500">Commits</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity log */}
            {progress?.activityLog && progress.activityLog.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                <div className="text-gray-400 text-xs mb-2 uppercase tracking-wider">
                  Activity Log
                </div>
                {progress.activityLog.slice(-20).map((entry, i) => (
                  <div
                    key={i}
                    className={`py-0.5 ${
                      entry.type === 'success'
                        ? 'text-green-400'
                        : entry.type === 'error'
                          ? 'text-red-400'
                          : entry.type === 'warning'
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500 mr-2">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="syncDays" className="block text-sm font-medium text-gray-700 mb-1">
                  Days to sync
                </label>
                <select
                  id="syncDays"
                  name="syncDays"
                  value={syncDays}
                  onChange={(e) => setSyncDays(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 6 months</option>
                  <option value="365">Last year</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="repository"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Repository (optional)
                </label>
                <select
                  id="repository"
                  name="repository"
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All repositories</option>
                  {repos?.repositories.map((repo) => (
                    <option key={repo.name} value={repo.name}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleStartSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isSyncing ? 'Starting…' : 'Start Sync'}
            </button>
          </div>
        )}
      </div>

      {/* Recent jobs */}
      {syncJobs && syncJobs.jobs.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sync Jobs</h2>
          <div className="space-y-2">
            {syncJobs.jobs.map((job) => (
              <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Job header - clickable */}
                <button
                  onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                  aria-expanded={expandedJobId === job.id}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        job.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : job.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : job.status === 'running'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.status}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-sm text-gray-700">
                        {job.params ? `Last ${job.params.since} days` : job.progress.message}
                        {job.params?.repository && (
                          <span className="text-gray-400 ml-1">({job.params.repository})</span>
                        )}
                      </span>
                      {job.result && (
                        <span className="text-xs text-gray-500">
                          {job.result.repositoriesProcessed} repos,{' '}
                          {job.result.pullRequestsProcessed} PRs, {job.result.reviewsProcessed}{' '}
                          reviews
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(job.startedAt).toLocaleString()}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedJobId === job.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded details */}
                {expandedJobId === job.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                    {/* Sync parameters */}
                    {job.params && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Sync Parameters
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Date Range:</span>{' '}
                            <span className="font-medium text-gray-900">
                              Last {job.params.since} days
                            </span>
                          </div>
                          {job.params.repository && (
                            <div>
                              <span className="text-gray-500">Repository:</span>{' '}
                              <span className="font-medium text-gray-900">
                                {job.params.repository}
                              </span>
                            </div>
                          )}
                          {!job.params.repository && (
                            <div>
                              <span className="text-gray-500">Scope:</span>{' '}
                              <span className="font-medium text-gray-900">All repositories</span>
                            </div>
                          )}
                          {job.params.force && (
                            <div>
                              <span className="text-orange-600 font-medium">
                                Force sync enabled
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Result summary */}
                    {job.result && (
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div className="bg-white rounded p-2">
                          <div className="text-lg font-semibold text-gray-900">
                            {job.result.repositoriesProcessed}
                          </div>
                          <div className="text-xs text-gray-500">Repos</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-lg font-semibold text-gray-900">
                            {job.result.pullRequestsProcessed}
                          </div>
                          <div className="text-xs text-gray-500">PRs</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-lg font-semibold text-gray-900">
                            {job.result.reviewsProcessed}
                          </div>
                          <div className="text-xs text-gray-500">Reviews</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-lg font-semibold text-gray-900">
                            {job.result.commentsProcessed}
                          </div>
                          <div className="text-xs text-gray-500">Comments</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-lg font-semibold text-gray-900">
                            {job.result.commitsProcessed}
                          </div>
                          <div className="text-xs text-gray-500">Commits</div>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {job.error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        {job.error}
                      </div>
                    )}

                    {/* Activity log */}
                    {job.activityLog && job.activityLog.length > 0 && (
                      <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
                        <div className="text-gray-400 text-xs mb-2 uppercase tracking-wider">
                          Activity Log ({job.activityLog.length} entries)
                        </div>
                        {job.activityLog.map((entry, i) => (
                          <div
                            key={i}
                            className={`py-0.5 ${
                              entry.type === 'success'
                                ? 'text-green-400'
                                : entry.type === 'error'
                                  ? 'text-red-400'
                                  : entry.type === 'warning'
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                            }`}
                          >
                            <span className="text-gray-500 mr-2">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                            {entry.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timing info */}
                    <div className="text-xs text-gray-500 flex gap-4">
                      <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                      {job.completedAt && (
                        <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
