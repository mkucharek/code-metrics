import { clsx } from 'clsx';
import type { PRDetail } from '../lib/api';

interface PRTableProps {
  prs: PRDetail[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

export function PRTable({ prs }: PRTableProps) {
  if (prs.length === 0) {
    return <div className="text-gray-500 text-center py-8">No pull requests found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Week
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Repository
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              PR
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Changes
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reviews
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {prs.map((pr) => {
            const prNum = pr.prNumber ?? pr.number;
            const status = pr.status ?? pr.state ?? 'open';
            const linesAdded = pr.linesAdded ?? pr.additions ?? 0;
            const linesDeleted = pr.linesDeleted ?? pr.deletions ?? 0;

            return (
              <tr key={`${pr.repository}-${prNum}`} className="hover:bg-gray-50">
                <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-400">
                  {pr.weekNumber || '-'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                  {pr.repository}
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-gray-900">#{prNum}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">{pr.title}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span
                    className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      STATUS_STYLES[status]
                    )}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                  <span className="text-green-600">+{linesAdded}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-red-600">-{linesDeleted}</span>
                  {pr.changedFiles !== undefined && (
                    <span className="text-gray-400 ml-2 text-xs">({pr.changedFiles} files)</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                  {pr.reviews !== undefined ? (
                    <span title={`${pr.comments || 0} comments`}>
                      {pr.reviews}{' '}
                      <span className="text-xs text-gray-400">({pr.comments || 0})</span>
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                  {pr.timeToMerge || '-'}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                  {formatDate(pr.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
