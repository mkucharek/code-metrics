import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useEngineerMetrics } from '../hooks/useMetrics';
import { api } from '../lib/api';
import { DateRangePicker } from '../components/DateRangePicker';
import { MetricCard } from '../components/MetricCard';
import { ContributionHeatmap } from '../components/ContributionHeatmap';
import { PRTable } from '../components/PRTable';
import { CommitsTable } from '../components/CommitsTable';
import { WeeklyActivityTable } from '../components/WeeklyActivityTable';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function EngineerDetail() {
  const { username } = useParams<{ username: string }>();
  const [dateRange, setDateRange] = useState({ since: '90' });
  const [prTab, setPrTab] = useState<'all' | 'open' | 'merged' | 'closed'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading, error } = useEngineerMetrics(username!, dateRange);

  const handleDownloadMarkdown = async () => {
    if (!username) return;
    setIsExporting(true);
    try {
      const blob = await api.getEngineerReportMarkdown(username, dateRange);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${username}-report.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading engineer data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error.message}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  // Prepare PR size distribution data
  const sizeDistribution = Object.entries(report.activity.prSizeDistribution).map(
    ([size, count]) => ({
      name: size,
      value: count,
    })
  );

  // Filter PRs by tab
  const filteredPRs =
    prTab === 'all'
      ? report.prs
      : report.prs.filter((pr) => {
          const status = pr.status ?? pr.state;
          if (prTab === 'merged') return status === 'merged';
          if (prTab === 'open') return status === 'open';
          if (prTab === 'closed') return status === 'closed';
          return true;
        });

  // Calculate WIP stats (open PRs)
  const openPRs = report.prs.filter((pr) => (pr.status ?? pr.state) === 'open');
  const wipLines = openPRs.reduce(
    (sum, pr) =>
      sum + (pr.linesAdded ?? pr.additions ?? 0) + (pr.linesDeleted ?? pr.deletions ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span>Engineer</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{report.engineer}</h1>
          <p className="text-gray-500 mt-1">
            {report.summary.activeDays} active days | Most productive:{' '}
            {report.summary.mostProductiveDay} | Busiest week: {report.summary.busiestWeek}
          </p>
          {openPRs.length > 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              Work In Progress: {wipLines.toLocaleString()} lines across {openPRs.length} open PR
              {openPRs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={handleDownloadMarkdown}
            disabled={isExporting || isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="PRs Opened"
          value={report.activity.prsOpened}
          subtext={`${report.summary.avgPRsPerWeek.toFixed(1)}/week`}
        />
        <MetricCard
          label="Reviews Given"
          value={report.reviews.prsReviewed}
          subtext={`${report.reviews.avgCommentsPerReview.toFixed(1)} comments/review`}
        />
        <MetricCard
          label="Lines Changed"
          value={(report.activity.linesAdded + report.activity.linesDeleted).toLocaleString()}
          subtext={`+${report.activity.linesAdded.toLocaleString()} / -${report.activity.linesDeleted.toLocaleString()}`}
        />
        <MetricCard
          label="Merge Rate"
          value={`${report.activity.mergeRate.toFixed(1)}%`}
          subtext={`${report.activity.prsMerged} merged`}
        />
      </div>

      {/* Contribution heatmap */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">Contribution Activity</h2>
        <p className="text-sm text-gray-500 mb-4">
          Daily activity: PRs opened/merged, reviews given, and comments made
        </p>
        <ContributionHeatmap data={report.contributionHeatmap} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly activity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h2>
          {report.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={report.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekNumber" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="prsOpened"
                  stroke="#3b82f6"
                  name="PRs"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="reviewsGiven"
                  stroke="#10b981"
                  name="Reviews"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-8">No activity data</div>
          )}
        </div>

        {/* PR size distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">PR Size Distribution</h2>
          {sizeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sizeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {sizeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-8">No PR data</div>
          )}
        </div>
      </div>

      {/* Turnaround times */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Turnaround Times (hours)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500 mb-2">Time to First Review</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {report.turnaround.timeToFirstReview.median.toFixed(1)}h
              </span>
              <span className="text-sm text-gray-400">median</span>
            </div>
            <div className="text-xs text-gray-400">
              p75: {report.turnaround.timeToFirstReview.p75.toFixed(1)}h | p95:{' '}
              {report.turnaround.timeToFirstReview.p95.toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Time to Approval</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {report.turnaround.timeToApproval.median.toFixed(1)}h
              </span>
              <span className="text-sm text-gray-400">median</span>
            </div>
            <div className="text-xs text-gray-400">
              p75: {report.turnaround.timeToApproval.p75.toFixed(1)}h | p95:{' '}
              {report.turnaround.timeToApproval.p95.toFixed(1)}h
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Time to Merge</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {report.turnaround.timeToMerge.median.toFixed(1)}h
              </span>
              <span className="text-sm text-gray-400">median</span>
            </div>
            <div className="text-xs text-gray-400">
              p75: {report.turnaround.timeToMerge.p75.toFixed(1)}h | p95:{' '}
              {report.turnaround.timeToMerge.p95.toFixed(1)}h
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Top Reviewers</h2>
          <p className="text-sm text-gray-500 mb-4">
            Engineers who reviewed this person's PRs most frequently
          </p>
          {report.collaboration.topReviewers.length > 0 ? (
            <ul className="space-y-2">
              {report.collaboration.topReviewers.slice(0, 5).map((r) => (
                <li key={r.engineer} className="flex justify-between">
                  <Link
                    to={`/engineer/${r.engineer}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {r.engineer}
                  </Link>
                  <span className="text-gray-500">{r.count} reviews</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No reviewer data</div>
          )}
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Most Reviewed</h2>
          <p className="text-sm text-gray-500 mb-4">
            Engineers whose PRs this person reviewed most often
          </p>
          {report.collaboration.topReviewedEngineers.length > 0 ? (
            <ul className="space-y-2">
              {report.collaboration.topReviewedEngineers.slice(0, 5).map((r) => (
                <li key={r.engineer} className="flex justify-between">
                  <Link
                    to={`/engineer/${r.engineer}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {r.engineer}
                  </Link>
                  <span className="text-gray-500">{r.count} reviews given</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">No review data</div>
          )}
        </div>
      </div>

      {/* Code Impact Heatmap */}
      {report.codeImpactHeatmap && report.codeImpactHeatmap.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Code Impact</h2>
          <p className="text-sm text-gray-500 mb-4">
            Total lines added and deleted per day from merged PRs
          </p>
          <ContributionHeatmap data={report.codeImpactHeatmap} label="lines changed" />
        </div>
      )}

      {/* Weekly Activity Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Activity Breakdown</h2>
        </div>
        <WeeklyActivityTable timeline={report.timeline} />
      </div>

      {/* PR Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pull Requests</h2>
          <div className="flex gap-2">
            {(['all', 'open', 'merged', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPrTab(tab)}
                className={`px-3 py-1 text-sm rounded-md ${
                  prTab === tab ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <PRTable prs={filteredPRs} />
      </div>

      {/* Commits Table */}
      {report.commitsList && report.commitsList.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Direct Commits ({report.commitsList.length})
            </h2>
          </div>
          <CommitsTable commits={report.commitsList} initialItems={25} incrementBy={25} />
        </div>
      )}
    </div>
  );
}
