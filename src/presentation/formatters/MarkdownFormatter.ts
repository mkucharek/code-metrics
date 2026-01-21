/**
 * Markdown Report Formatter
 * Pure functions to format metrics data into Markdown
 */

import type {
  DailyContribution,
  EngineerDetailReport,
  EngineerMetrics,
  OrganizationMetrics,
  PRDetail,
  RepositoryHealthReport,
} from '../../domain/models';
import { formatLocalDate } from '../../domain/utils/dates';

/**
 * Format hours into human-readable time string
 */
function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  } else if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}

/**
 * Format organization metrics as Markdown overview report
 */
export function formatOrganizationReport(
  metrics: OrganizationMetrics,
  repositories?: string[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Engineering Metrics Report`);
  lines.push('');
  lines.push(`**Organization:** ${metrics.organization}`);
  lines.push(
    `**Period:** ${metrics.dateRange.start.toISOString().split('T')[0]} to ${metrics.dateRange.end.toISOString().split('T')[0]}`
  );

  if (repositories && repositories.length > 0) {
    lines.push(
      `**Repositories:** ${repositories.length === 1 ? repositories[0] : repositories.join(', ')}`
    );
  }

  lines.push('');

  // Summary
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- **Engineers:** ${metrics.engineerCount}`);
  lines.push(`- **Total PRs:** ${metrics.totalPRsCreated}`);
  lines.push(
    `- **PRs Merged:** ${metrics.totalPRsMerged} (${(metrics.mergeRate * 100).toFixed(1)}%)`
  );
  lines.push(`- **Total Reviews:** ${metrics.totalReviewsGiven}`);
  lines.push(`- **Total Comments:** ${metrics.totalCommentsCreated}`);
  lines.push(`- **Lines Added:** ${metrics.totalLinesAdded.toLocaleString()}`);
  lines.push(`- **Lines Deleted:** ${metrics.totalLinesDeleted.toLocaleString()}`);
  lines.push(`- **Avg PR Size:** ${metrics.avgPRSize.toLocaleString()} lines`);
  lines.push('');

  // Repositories
  if (metrics.repositories.length > 0) {
    lines.push(`## Active Repositories (${metrics.repositories.length})`);
    lines.push('');
    metrics.repositories.forEach((repo) => {
      lines.push(`- ${repo}`);
    });
    lines.push('');
  }

  // Engineer metrics table
  lines.push(`## Engineer Metrics`);
  lines.push('');
  lines.push(
    '| Engineer | PRs Created | PRs Merged | Merge Rate | Reviews Given | Comments | Lines Added | Lines Deleted | Total Changed |'
  );
  lines.push(
    '|----------|-------------|------------|------------|---------------|----------|-------------|---------------|---------------|'
  );

  // Sort by PRs created (descending)
  const sortedEngineers = [...metrics.engineers].sort((a, b) => b.prsCreated - a.prsCreated);

  sortedEngineers.forEach((engineer) => {
    const mergeRate = (engineer.mergeRate * 100).toFixed(0);
    lines.push(
      `| ${engineer.engineer} | ${engineer.prsCreated} | ${engineer.prsMerged} | ${mergeRate}% | ${engineer.reviewsGiven} | ${engineer.commentsCreated} | ${engineer.linesAdded.toLocaleString()} | ${engineer.linesDeleted.toLocaleString()} | ${engineer.totalLinesChanged.toLocaleString()} |`
    );
  });

  lines.push('');

  return lines.join('\n');
}

/**
 * Format individual engineer metrics as detailed Markdown report
 */
export function formatEngineerReport(engineer: EngineerMetrics): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Engineer Report: ${engineer.engineer}`);
  lines.push('');
  lines.push(
    `**Period:** ${engineer.dateRange.start.toISOString().split('T')[0]} to ${engineer.dateRange.end.toISOString().split('T')[0]}`
  );
  lines.push('');

  // Pull Requests Section
  lines.push(`## Pull Requests`);
  lines.push('');
  lines.push(`- **Created:** ${engineer.prsCreated}`);
  lines.push(`- **Merged:** ${engineer.prsMerged}`);
  lines.push(`- **Merge Rate:** ${(engineer.mergeRate * 100).toFixed(1)}%`);
  lines.push(`- **Average Size:** ${engineer.avgPRSize.toLocaleString()} lines`);
  lines.push('');

  // Code Contribution Section
  lines.push(`## Code Contribution`);
  lines.push('');
  lines.push(`- **Lines Added:** ${engineer.linesAdded.toLocaleString()}`);
  lines.push(`- **Lines Deleted:** ${engineer.linesDeleted.toLocaleString()}`);
  lines.push(`- **Net Lines:** ${engineer.netLines.toLocaleString()}`);
  lines.push(`- **Total Lines Changed:** ${engineer.totalLinesChanged.toLocaleString()}`);
  lines.push('');

  // Collaboration Section
  lines.push(`## Collaboration`);
  lines.push('');
  lines.push(`- **Reviews Given:** ${engineer.reviewsGiven}`);
  lines.push(`- **Comments Created:** ${engineer.commentsCreated}`);
  lines.push('');

  // Repositories Section
  if (engineer.repositories.length > 0) {
    lines.push(`## Active Repositories (${engineer.repositories.length})`);
    lines.push('');
    engineer.repositories.forEach((repo) => {
      lines.push(`- ${repo}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format team comparison/rankings as Markdown
 */
export function formatTeamRankings(metrics: OrganizationMetrics): string {
  const lines: string[] = [];

  lines.push(`# Team Rankings`);
  lines.push('');
  lines.push(
    `**Period:** ${metrics.dateRange.start.toISOString().split('T')[0]} to ${metrics.dateRange.end.toISOString().split('T')[0]}`
  );
  lines.push('');

  // Top PR Creators
  lines.push(`## Top PR Creators`);
  lines.push('');
  const topPRCreators = [...metrics.engineers]
    .sort((a, b) => b.prsCreated - a.prsCreated)
    .slice(0, 10);
  topPRCreators.forEach((engineer, index) => {
    lines.push(`${index + 1}. **${engineer.engineer}** - ${engineer.prsCreated} PRs`);
  });
  lines.push('');

  // Top Reviewers
  lines.push(`## Top Reviewers`);
  lines.push('');
  const topReviewers = [...metrics.engineers]
    .sort((a, b) => b.reviewsGiven - a.reviewsGiven)
    .slice(0, 10);
  topReviewers.forEach((engineer, index) => {
    lines.push(`${index + 1}. **${engineer.engineer}** - ${engineer.reviewsGiven} reviews`);
  });
  lines.push('');

  // Top Code Contributors (by total lines changed)
  lines.push(`## Top Code Contributors`);
  lines.push('');
  const topContributors = [...metrics.engineers]
    .sort((a, b) => b.totalLinesChanged - a.totalLinesChanged)
    .slice(0, 10);
  topContributors.forEach((engineer, index) => {
    lines.push(
      `${index + 1}. **${engineer.engineer}** - ${engineer.totalLinesChanged.toLocaleString()} lines changed`
    );
  });
  lines.push('');

  // Most Collaborative (reviews + comments)
  lines.push(`## Most Collaborative`);
  lines.push('');
  const mostCollaborative = [...metrics.engineers]
    .sort((a, b) => b.reviewsGiven + b.commentsCreated - (a.reviewsGiven + a.commentsCreated))
    .slice(0, 10);
  mostCollaborative.forEach((engineer, index) => {
    const collaborationScore = engineer.reviewsGiven + engineer.commentsCreated;
    lines.push(`${index + 1}. **${engineer.engineer}** - ${collaborationScore} interactions`);
  });
  lines.push('');

  return lines.join('\n');
}

/**
 * Format engineer detail report as comprehensive Markdown
 */
export function formatEngineerDetailReport(
  report: EngineerDetailReport,
  repositories?: string[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Engineering Report: ${report.engineer}`);
  lines.push('');
  lines.push(
    `**Period:** ${formatLocalDate(report.dateRange.start)} to ${formatLocalDate(report.dateRange.end)}`
  );

  if (repositories && repositories.length > 0) {
    lines.push(
      `**Repositories:** ${repositories.length === 1 ? repositories[0] : repositories.join(', ')}`
    );
  }

  lines.push('');

  // Summary Stats
  lines.push(`## 📋 Summary`);
  lines.push('');
  lines.push(
    `- **PRs Opened:** ${report.activity.prsOpened} (${report.activity.prsMerged} merged, ${report.activity.prsClosed} closed)`
  );
  lines.push(`- **Merge Rate:** ${report.activity.mergeRate.toFixed(1)}%`);
  lines.push(`- **Avg PRs/Week:** ${report.summary.avgPRsPerWeek}`);
  lines.push(`- **Most Productive Day:** ${report.summary.mostProductiveDay}`);
  lines.push(`- **Busiest Week:** ${report.summary.busiestWeek}`);
  lines.push(
    `- **Active Days:** ${report.summary.activeDays} of ${report.summary.totalWeeks * 7} days`
  );
  lines.push('');

  // Consolidated Code Contributions
  lines.push(`## 📊 Code Contributions`);
  lines.push('');

  // PR contributions
  lines.push(`**Via Pull Requests:**`);
  lines.push(`- **Lines Added:** ${report.activity.linesAdded.toLocaleString()}`);
  lines.push(`- **Lines Deleted:** ${report.activity.linesDeleted.toLocaleString()}`);
  lines.push(`- **Total Churn:** ${report.activity.totalChurn.toLocaleString()} lines`);
  lines.push(`- **Average PR Size:** ${Math.round(report.activity.avgPrSize)} lines`);

  // Inline PR size distribution
  const dist = report.activity.prSizeDistribution;
  lines.push(
    `- **PR Sizes:** ${dist.small} small (<100), ${dist.medium} medium (100-500), ${dist.large} large (>500)`
  );
  lines.push('');

  // Direct commits (if present)
  if (report.commits.totalCommits > 0) {
    lines.push(`**Via Direct Commits:**`);
    lines.push(
      `- ${report.commits.totalCommits} commits (${report.commits.avgCommitsPerDay.toFixed(1)} per day)`
    );
    lines.push(`- **Lines Added:** ${report.commits.linesAdded.toLocaleString()}`);
    lines.push(`- **Lines Deleted:** ${report.commits.linesDeleted.toLocaleString()}`);
    const commitChurn = report.commits.linesAdded + report.commits.linesDeleted;
    lines.push(`- **Total Churn:** ${commitChurn.toLocaleString()} lines`);
    lines.push('');
  }

  lines.push(`> **Note:** Merge commits and squash-merge commits are excluded from all metrics.`);
  lines.push('');

  // Activity Timeline (shows all activity: PRs, Reviews, Comments, Commits)
  if (report.contributionHeatmap.length > 0) {
    lines.push(`## 📈 Activity Timeline`);
    lines.push('');

    // Group contributions by week and day of week
    const heatmapData = new Map<string, Map<number, DailyContribution>>();
    const weekNumbers = new Set<string>();

    report.contributionHeatmap.forEach((contribution) => {
      const date = new Date(contribution.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get ISO week number
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      const year = tempDate.getFullYear();
      const weekKey = `${year}-W${weekNo.toString().padStart(2, '0')}`;

      weekNumbers.add(weekKey);

      if (!heatmapData.has(weekKey)) {
        heatmapData.set(weekKey, new Map());
      }
      heatmapData.get(weekKey)!.set(dayOfWeek, contribution);
    });

    // Get sorted weeks
    const sortedWeeks = Array.from(weekNumbers).sort();

    // Emoji mapping
    const levelEmoji = ['⬜', '🟩', '🟨', '🟧', '🟥'];

    // Build Markdown table
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Table header - display only week number (strip year prefix)
    const displayWeeks = sortedWeeks.map((w) => w.split('-')[1]);
    const headerRow = `| Day | ${displayWeeks.join(' | ')} |`;
    const separatorRow = `|-----|${sortedWeeks.map(() => '-----').join('|')}|`;
    lines.push(headerRow);
    lines.push(separatorRow);

    // Table rows for each day
    for (let dayIndex = 0; dayIndex < dayNames.length; dayIndex++) {
      const dayName = dayNames[dayIndex];
      // Map Mon=1, Tue=2, ..., Sun=0
      const dayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;

      let row = `| **${dayName}** |`;

      for (const week of sortedWeeks) {
        const contribution = heatmapData.get(week)?.get(dayOfWeek);
        const emoji = contribution ? levelEmoji[contribution.level] : '⬜';
        row += ` ${emoji} |`;
      }

      lines.push(row);
    }

    lines.push('');

    // Legend and stats
    const totalContributions = report.contributionHeatmap.reduce((sum, c) => sum + c.count, 0);
    lines.push(`**Legend:** ⬜ None  🟩 1-2  🟨 3-5  🟧 6-10  🟥 11+`);
    lines.push(
      `**Total:** ${totalContributions} activities (PRs, reviews, comments, commits) over ${report.contributionHeatmap.length} days`
    );
    lines.push('');
  }

  // Code Impact Timeline (shows line changes from PRs + commits)
  if (report.codeImpactHeatmap.length > 0) {
    lines.push(`## 📊 Code Impact Timeline`);
    lines.push('');

    // Group contributions by week and day of week
    const heatmapData = new Map<string, Map<number, DailyContribution>>();
    const weekNumbers = new Set<string>();

    report.codeImpactHeatmap.forEach((contribution) => {
      const date = new Date(contribution.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get ISO week number
      const tempDate = new Date(date);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      const year = tempDate.getFullYear();
      const weekKey = `${year}-W${weekNo.toString().padStart(2, '0')}`;

      weekNumbers.add(weekKey);

      if (!heatmapData.has(weekKey)) {
        heatmapData.set(weekKey, new Map());
      }
      heatmapData.get(weekKey)!.set(dayOfWeek, contribution);
    });

    // Get sorted weeks
    const sortedWeeks = Array.from(weekNumbers).sort();

    // Emoji mapping
    const levelEmoji = ['⬜', '🟩', '🟨', '🟧', '🟥'];

    // Build Markdown table
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Table header - display only week number (strip year prefix)
    const displayWeeks = sortedWeeks.map((w) => w.split('-')[1]);
    const headerRow = `| Day | ${displayWeeks.join(' | ')} |`;
    const separatorRow = `|-----|${sortedWeeks.map(() => '-----').join('|')}|`;
    lines.push(headerRow);
    lines.push(separatorRow);

    // Table rows for each day
    for (let dayIndex = 0; dayIndex < dayNames.length; dayIndex++) {
      const dayName = dayNames[dayIndex];
      // Map Mon=1, Tue=2, ..., Sun=0
      const dayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;

      let row = `| **${dayName}** |`;

      for (const week of sortedWeeks) {
        const contribution = heatmapData.get(week)?.get(dayOfWeek);
        const emoji = contribution ? levelEmoji[contribution.level] : '⬜';
        row += ` ${emoji} |`;
      }

      lines.push(row);
    }

    lines.push('');

    // Legend and stats
    const totalLines = report.codeImpactHeatmap.reduce((sum, c) => sum + c.count, 0);
    const daysWithCode = report.codeImpactHeatmap.filter((c) => c.count > 0).length;
    lines.push(`**Legend:** ⬜ None  🟩 1-100  🟨 101-500  🟧 501-1k  🟥 1k+`);
    lines.push(
      `**Total:** ${totalLines.toLocaleString()} lines changed across ${daysWithCode} days (PRs + direct commits)`
    );
    lines.push('');
  }

  // Consolidated Collaboration & Code Reviews
  lines.push(`## 🤝 Collaboration & Code Reviews`);
  lines.push('');

  // Review activity
  lines.push(`- **PRs Reviewed:** ${report.reviews.prsReviewed}`);
  lines.push(`- **Comments Made:** ${report.reviews.commentsMade}`);
  lines.push(`- **Avg Comments per Review:** ${report.reviews.avgCommentsPerReview.toFixed(1)}`);
  lines.push('');

  // Review turnaround times (inline, not separate section)
  if (report.turnaround.timeToFirstReview.median > 0) {
    lines.push(`**Review Turnaround Times:**`);
    lines.push(
      `- **Time to First Review:** ${formatHours(report.turnaround.timeToFirstReview.median)} (median)`
    );
    if (report.turnaround.timeToApproval.median > 0) {
      lines.push(
        `- **Time to Approval:** ${formatHours(report.turnaround.timeToApproval.median)} (median)`
      );
    }
    if (report.turnaround.timeToMerge.median > 0) {
      lines.push(
        `- **Time to Merge:** ${formatHours(report.turnaround.timeToMerge.median)} (median)`
      );
    }
    lines.push('');
  }

  // Top reviewers who reviewed engineer's PRs
  if (report.collaboration.topReviewers.length > 0) {
    lines.push(`**Top Reviewers (who reviewed your PRs):**`);
    lines.push('');
    report.collaboration.topReviewers.slice(0, 5).forEach((partner, index) => {
      const crossTeamBadge = partner.isCrossTeam ? ' 🔄' : '';
      const teamInfo = partner.team ? ` (${partner.team})` : '';
      lines.push(
        `${index + 1}. **${partner.engineer}**${teamInfo}${crossTeamBadge} - ${partner.count} reviews`
      );
    });
    lines.push('');
  }

  // Engineers that this person reviewed most often
  if (report.collaboration.topReviewedEngineers.length > 0) {
    lines.push(`**You Reviewed Most Often:**`);
    lines.push('');
    report.collaboration.topReviewedEngineers.slice(0, 5).forEach((partner, index) => {
      const crossTeamBadge = partner.isCrossTeam ? ' 🔄' : '';
      const teamInfo = partner.team ? ` (${partner.team})` : '';
      lines.push(
        `${index + 1}. **${partner.engineer}**${teamInfo}${crossTeamBadge} - ${partner.count} PRs reviewed`
      );
    });
    lines.push('');
  }

  // Repository Contributions (only if multiple repos)
  if (report.repositories.length > 1) {
    lines.push(`## 📁 Repository Contributions`);
    lines.push('');
    lines.push('| Repository | Merged PRs | Lines Added | Lines Deleted | Total Churn |');
    lines.push('|------------|------------|-------------|---------------|-------------|');

    report.repositories.forEach((repo) => {
      const totalChurn = repo.linesAdded + repo.linesDeleted;
      lines.push(
        `| ${repo.repository} | ${repo.prCount} | ${repo.linesAdded.toLocaleString()} | ${repo.linesDeleted.toLocaleString()} | ${totalChurn.toLocaleString()} |`
      );
    });
    lines.push('');
  }

  // Weekly Activity Timeline with PR Size Trends
  if (report.timeline.length > 0) {
    lines.push(`## 📈 Weekly Activity & Size Trends`);
    lines.push('');
    lines.push('| Week | Week Starting | PRs | Merged | Reviews | Comments | Avg Size | S/M/L |');
    lines.push('|------|---------------|-----|--------|---------|----------|----------|-------|');

    report.timeline.forEach((week) => {
      const sizeBreakdown = `${week.smallPRs}/${week.mediumPRs}/${week.largePRs}`;
      lines.push(
        `| ${week.weekNumber} | ${week.weekStart} | ${week.prsOpened} | ${week.prsMerged} | ${week.reviewsGiven} | ${week.commentsWritten} | ${week.avgPrSize} | ${sizeBreakdown} |`
      );
    });
    lines.push('');
    lines.push(`**Note:** S/M/L = Small (<100) / Medium (100-500) / Large (>500 lines)`);
    lines.push('');
  }

  // PR List - Grouped by State
  if (report.prs.length > 0) {
    lines.push(`## 📝 Pull Requests`);
    lines.push('');

    // Add summary line if many PRs
    if (report.prs.length > 20) {
      const openCount = report.prs.filter((pr) => pr.status === 'open').length;
      const mergedCount = report.prs.filter((pr) => pr.status === 'merged').length;
      const closedCount = report.prs.filter((pr) => pr.status === 'closed').length;
      lines.push(`**Summary:** ${openCount} open • ${mergedCount} merged • ${closedCount} closed`);
      lines.push('');
    }

    // Helper to calculate age for open PRs
    const calculateAge = (pr: PRDetail): string => {
      const now = new Date();
      const diffMs = now.getTime() - pr.createdAt.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffDays >= 1) {
        return `${Math.round(diffDays)}d`;
      } else {
        return `${Math.round(diffHours)}h`;
      }
    };

    // Helper to render a PR table row
    const renderPRRow = (pr: PRDetail, organization: string, timeColumn: string): string => {
      const prLink = `[#${pr.prNumber}](https://github.com/${organization}/${pr.repository}/pull/${pr.prNumber})`;
      return `| ${pr.weekNumber} | ${pr.repository} | ${prLink} | ${pr.title} | ${pr.linesAdded} | ${pr.linesDeleted} | ${pr.reviews} | ${pr.comments} | ${timeColumn} | ${pr.changedFiles} | ${pr.commits} |`;
    };

    // Group PRs by state
    const openPRs = report.prs.filter((pr) => pr.status === 'open');
    const mergedPRs = report.prs.filter((pr) => pr.status === 'merged');
    const closedPRs = report.prs.filter((pr) => pr.status === 'closed');

    // Sort: open PRs oldest-first (highlight stale), merged/closed newest-first
    openPRs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    mergedPRs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    closedPRs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Render Open PRs section
    if (openPRs.length > 0) {
      lines.push(`### 🟡 Open PRs (${openPRs.length})`);
      lines.push('*PRs created in this period that are still open (not included in line metrics)*');
      lines.push('');

      // Add WIP summary
      const wipLinesAdded = openPRs.reduce((sum, pr) => sum + pr.linesAdded, 0);
      const wipLinesDeleted = openPRs.reduce((sum, pr) => sum + pr.linesDeleted, 0);
      const wipTotalLines = wipLinesAdded + wipLinesDeleted;
      const wipCommits = openPRs.reduce((sum, pr) => sum + pr.commits, 0);
      lines.push(
        `**Work In Progress:** ${wipTotalLines.toLocaleString()} lines (${wipLinesAdded.toLocaleString()}+ / ${wipLinesDeleted.toLocaleString()}-) across ${openPRs.length} ${openPRs.length === 1 ? 'PR' : 'PRs'} • ${wipCommits} ${wipCommits === 1 ? 'commit' : 'commits'}`
      );
      lines.push('');

      lines.push(
        '| Week | Repo | PR # | Title | Added | Deleted | Reviews | Comments | Age | Files | Commits |'
      );
      lines.push(
        '|------|------|------|-------|-------|---------|---------|----------|-----|-------|---------|'
      );

      openPRs.forEach((pr) => {
        const age = calculateAge(pr);
        lines.push(renderPRRow(pr, report.organization, age));
      });
      lines.push('');
    }

    // Render Merged PRs section
    if (mergedPRs.length > 0) {
      lines.push(`### ✅ Merged PRs (${mergedPRs.length})`);
      lines.push('');
      lines.push(
        '| Week | Repo | PR # | Title | Added | Deleted | Reviews | Comments | Time to Merge | Files | Commits |'
      );
      lines.push(
        '|------|------|------|-------|-------|---------|---------|----------|---------------|-------|---------|'
      );

      mergedPRs.forEach((pr) => {
        lines.push(renderPRRow(pr, report.organization, pr.timeToMerge));
      });
      lines.push('');
    }

    // Render Closed (Unmerged) PRs section
    if (closedPRs.length > 0) {
      lines.push(`### ❌ Closed (Unmerged) PRs (${closedPRs.length})`);
      lines.push('');
      lines.push(
        '| Week | Repo | PR # | Title | Added | Deleted | Reviews | Comments | Time Open | Files | Commits |'
      );
      lines.push(
        '|------|------|------|-------|-------|---------|---------|----------|-----------|-------|---------|'
      );

      closedPRs.forEach((pr) => {
        const timeOpen = calculateAge(pr);
        lines.push(renderPRRow(pr, report.organization, timeOpen));
      });
      lines.push('');
    }
  }

  // Commits List
  if (report.commitsList && report.commitsList.length > 0) {
    lines.push(`## 💻 Commits (Non-Merge, Non-Squash)`);
    lines.push('');
    lines.push(`> **Note:** Merge commits and squash-merge commits are excluded from this list.`);
    lines.push('');
    lines.push(`**Total:** ${report.commitsList.length} commits`);
    lines.push('');

    // Render commits table
    lines.push('| Date | SHA | Message | Changes | Repository | PR |');
    lines.push('|------|-----|---------|---------|------------|-----|');

    report.commitsList.forEach((commit) => {
      const message =
        commit.message.length > 80 ? commit.message.substring(0, 77) + '...' : commit.message;
      const messageEscaped = message.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const commitLink = `[\`${commit.sha}\`](https://github.com/${report.organization}/${commit.repository}/commit/${commit.fullSha})`;
      const changes = `+${commit.additions}/-${commit.deletions}`;
      const prLink = commit.prNumber
        ? `[#${commit.prNumber}](https://github.com/${report.organization}/${commit.repository}/pull/${commit.prNumber})`
        : '-';
      lines.push(
        `| ${commit.date} | ${commitLink} | ${messageEscaped} | ${changes} | ${commit.repository} | ${prLink} |`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format repository health report as Markdown
 */
export function formatRepositoryHealthReport(report: RepositoryHealthReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Repository Health Report`);
  lines.push('');
  lines.push(`**Organization:** ${report.organization}`);
  lines.push(
    `**Period:** ${formatLocalDate(report.dateRange.start)} to ${formatLocalDate(report.dateRange.end)}`
  );
  lines.push('');

  // Most Active Repositories
  if (report.mostActive.length > 0) {
    lines.push(`## 🏆 Most Active Repositories`);
    lines.push('');
    report.mostActive.forEach((repo, index) => {
      lines.push(`### ${index + 1}. ${repo.repository}`);
      lines.push(`- **PRs:** ${repo.prCount}`);
      lines.push(`- **Merge Rate:** ${repo.mergeRate}%`);
      lines.push(`- **Active Engineers:** ${repo.activeEngineers}`);
      lines.push(`- **Avg Review Time:** ${formatHours(repo.avgReviewTime)}`);
      lines.push(`- **Avg PR Size:** ${repo.avgPrSize} lines`);
      lines.push('');
    });
  }

  // Best Merge Rate
  if (report.bestMergeRate.length > 0) {
    lines.push(`## ✅ Best Merge Rate`);
    lines.push('');
    report.bestMergeRate.forEach((repo, index) => {
      lines.push(
        `${index + 1}. **${repo.repository}** - ${repo.mergeRate}% (${repo.prsMerged}/${repo.prCount} PRs)`
      );
    });
    lines.push('');
  }

  // Slowest Reviews
  if (report.slowestReviews.length > 0) {
    lines.push(`## ⏱️ Slowest Review Times`);
    lines.push('');
    report.slowestReviews.forEach((repo, index) => {
      lines.push(
        `${index + 1}. **${repo.repository}** - ${formatHours(repo.avgReviewTime)} avg (${repo.prCount} PRs)`
      );
    });
    lines.push('');
  }

  // All Repositories Table
  if (report.repositories.length > 0) {
    lines.push(`## 📊 All Repositories (${report.repositories.length})`);
    lines.push('');
    lines.push('| Repository | PRs | Merged | Rate | Avg Review | Engineers | Avg Size |');
    lines.push('|------------|-----|--------|------|------------|-----------|----------|');

    report.repositories.forEach((repo) => {
      lines.push(
        `| ${repo.repository} | ${repo.prCount} | ${repo.prsMerged} | ${repo.mergeRate}% | ${formatHours(repo.avgReviewTime)} | ${repo.activeEngineers} | ${repo.avgPrSize} |`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}
