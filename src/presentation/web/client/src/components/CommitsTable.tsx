import { useState } from 'react';
import type { CommitDetail } from '../lib/api';

interface CommitsTableProps {
  commits: CommitDetail[];
  initialItems?: number;
  incrementBy?: number;
}

export function CommitsTable({ commits, initialItems = 25, incrementBy = 25 }: CommitsTableProps) {
  const [displayCount, setDisplayCount] = useState(initialItems);

  if (commits.length === 0) {
    return <div className="text-gray-500 text-center py-8">No commits found</div>;
  }

  const displayCommits = commits.slice(0, displayCount);
  const hasMore = displayCount < commits.length;
  const isExpanded = displayCount > initialItems;

  const handleShowMore = () => {
    setDisplayCount((prev) => Math.min(prev + incrementBy, commits.length));
  };

  const handleShowAll = () => {
    setDisplayCount(commits.length);
  };

  const handleCollapse = () => {
    setDisplayCount(initialItems);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SHA
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Message
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Changes
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Repository
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              PR
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayCommits.map((commit) => (
            <tr key={commit.fullSha} className="hover:bg-gray-50">
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{commit.date}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-700">
                  {commit.sha}
                </code>
              </td>
              <td className="px-3 py-3">
                <div
                  className="text-sm text-gray-900 truncate max-w-[300px]"
                  title={commit.message}
                >
                  {commit.message.split('\n')[0]}
                </div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                <span className="text-green-600">+{commit.additions}</span>
                <span className="text-gray-400 mx-1">/</span>
                <span className="text-red-600">-{commit.deletions}</span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                {commit.repository}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                {commit.prNumber ? `#${commit.prNumber}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {commits.length > initialItems && (
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {displayCommits.length} of {commits.length} commits
          </span>
          <div className="flex gap-2">
            {hasMore && (
              <>
                <button
                  onClick={handleShowMore}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                >
                  Show {Math.min(incrementBy, commits.length - displayCount)} more
                </button>
                <button
                  onClick={handleShowAll}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                >
                  Show all
                </button>
              </>
            )}
            {isExpanded && (
              <button
                onClick={handleCollapse}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                Collapse
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
