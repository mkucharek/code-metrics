/**
 * CSV Report Formatter
 * Pure functions to format metrics data as CSV
 */

import type { EngineerDetailReport } from '../../domain/models';

/**
 * Escape CSV field value (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number): string {
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format engineer detail report as CSV
 * Exports PR list as CSV for spreadsheet analysis
 */
export function formatEngineerDetailCSV(report: EngineerDetailReport): string {
  const lines: string[] = [];

  // Header
  lines.push(
    [
      'Week',
      'Repository',
      'PR Number',
      'Title',
      'Status',
      'Lines Added',
      'Lines Deleted',
      'Total Changed',
      'Reviews',
      'Comments',
      'Time to Merge',
      'Changed Files',
      'Commits',
      'Created Date',
    ]
      .map(escapeCSV)
      .join(',')
  );

  // PR rows
  report.prs.forEach((pr) => {
    const totalChanged = pr.linesAdded + pr.linesDeleted;
    const createdDate = pr.createdAt.toISOString().split('T')[0] || '';
    lines.push(
      [
        pr.weekNumber,
        pr.repository,
        pr.prNumber,
        pr.title,
        pr.status,
        pr.linesAdded,
        pr.linesDeleted,
        totalChanged,
        pr.reviews,
        pr.comments,
        pr.timeToMerge,
        pr.changedFiles,
        pr.commits,
        createdDate,
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  // Add commits section if present
  if (report.commitsList && report.commitsList.length > 0) {
    lines.push(''); // Empty line separator
    lines.push(''); // Empty line separator

    // Commits header
    lines.push(
      ['Date', 'SHA', 'Message', 'Lines Added', 'Lines Deleted', 'Repository']
        .map(escapeCSV)
        .join(',')
    );

    // Commit rows
    report.commitsList.forEach((commit) => {
      lines.push(
        [
          commit.date,
          commit.sha,
          commit.message,
          commit.additions,
          commit.deletions,
          commit.repository,
        ]
          .map(escapeCSV)
          .join(',')
      );
    });
  }

  // Add code impact heatmap section if present
  if (report.codeImpactHeatmap && report.codeImpactHeatmap.length > 0) {
    lines.push(''); // Empty line separator
    lines.push(''); // Empty line separator

    // Code impact header
    lines.push(['Date', 'Lines Changed', 'Impact Level'].map(escapeCSV).join(','));

    // Code impact rows
    report.codeImpactHeatmap.forEach((day) => {
      const levelNames: Record<number, string> = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High',
      };
      const levelName = levelNames[day.level] || 'Unknown';
      lines.push([day.date, day.count, levelName].map(escapeCSV).join(','));
    });
  }

  return lines.join('\n');
}
