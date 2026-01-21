import type { WeeklyActivity } from '../lib/api';

interface WeeklyActivityTableProps {
  timeline: WeeklyActivity[];
}

export function WeeklyActivityTable({ timeline }: WeeklyActivityTableProps) {
  if (timeline.length === 0) {
    return <div className="text-gray-500 text-center py-8">No weekly activity data</div>;
  }

  // Only show weeks with activity
  const activeWeeks = timeline.filter(
    (w) => w.prsOpened > 0 || w.reviewsGiven > 0 || w.commentsWritten > 0
  );

  if (activeWeeks.length === 0) {
    return <div className="text-gray-500 text-center py-8">No activity in this period</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Week
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              PRs
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Merged
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reviews
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Comments
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg Size
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              S/M/L
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {activeWeeks.map((week) => (
            <tr key={week.weekStart} className="hover:bg-gray-50">
              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{week.weekNumber}</div>
                <div className="text-xs text-gray-400">{week.weekStart}</div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                {week.prsOpened}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                {week.prsMerged}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                {week.reviewsGiven}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                {week.commentsWritten}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                {week.avgPrSize > 0 ? week.avgPrSize.toLocaleString() : '-'}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-center text-sm">
                <span className="text-green-600">{week.smallPRs}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-yellow-600">{week.mediumPRs}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-red-600">{week.largePRs}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
