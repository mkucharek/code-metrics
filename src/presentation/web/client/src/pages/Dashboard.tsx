import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrganizationMetrics, useTeams } from '../hooks/useMetrics';
import { DateRangePicker } from '../components/DateRangePicker';
import { MetricCard } from '../components/MetricCard';

export function Dashboard() {
  const [dateRange, setDateRange] = useState({ since: '30' });
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();

  const {
    data: metrics,
    isLoading,
    error,
  } = useOrganizationMetrics({
    ...dateRange,
    team: selectedTeam,
  });
  const { data: teamsData } = useTeams();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading metrics: {error.message}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Prepare data for top contributors chart
  const topContributors = [...metrics.engineers]
    .sort((a, b) => b.prsCreated - a.prsCreated)
    .slice(0, 10)
    .map((e) => ({
      name: e.engineer,
      prs: e.prsCreated,
      reviews: e.reviewsGiven,
    }));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">{metrics.organization}</p>
        </div>
        <div className="flex items-center gap-4">
          {teamsData && teamsData.teams.length > 0 && (
            <select
              value={selectedTeam || ''}
              onChange={(e) => setSelectedTeam(e.target.value || undefined)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">All Teams</option>
              {teamsData.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total PRs"
          value={metrics.totalPRsCreated}
          subtext={`${metrics.totalPRsMerged} merged`}
        />
        <MetricCard
          label="Engineers"
          value={metrics.engineerCount}
          subtext={`${metrics.repositories.length} repos`}
        />
        <MetricCard
          label="Merge Rate"
          value={`${(metrics.mergeRate * 100).toFixed(0)}%`}
          subtext="of PRs merged"
        />
        <MetricCard
          label="Avg PR Size"
          value={metrics.avgPRSize.toLocaleString()}
          subtext="lines changed"
        />
      </div>

      {/* Top contributors chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h2>
        {topContributors.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topContributors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="prs" fill="#3b82f6" name="PRs Created" />
              <Bar dataKey="reviews" fill="#10b981" name="Reviews Given" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500 text-center py-8">No contributor data available</div>
        )}
      </div>

      {/* Engineers table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Engineers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engineer
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRs
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lines
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merge Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.engineers.map((engineer) => (
                <tr key={engineer.engineer} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/engineer/${engineer.engineer}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {engineer.engineer}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {engineer.prsCreated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {engineer.reviewsGiven}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {engineer.totalLinesChanged.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {(engineer.mergeRate * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
