import { useState } from 'react';
import { clsx } from 'clsx';
import type { DailyContribution } from '../lib/api';

interface ContributionHeatmapProps {
  data: DailyContribution[];
  label?: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  count: number;
  weekNum: string;
}

const LEVEL_COLORS = [
  'bg-contribution-0',
  'bg-contribution-1',
  'bg-contribution-2',
  'bg-contribution-3',
  'bg-contribution-4',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

export function ContributionHeatmap({ data, label = 'contributions' }: ContributionHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    date: '',
    count: 0,
    weekNum: '',
  });

  // Group by week
  const weeks: DailyContribution[][] = [];
  let currentWeek: DailyContribution[] = [];

  // Sort data by date
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Empty day for padding
  const emptyDay: DailyContribution = { date: '', count: 0, level: 0 };

  sortedData.forEach((day, i) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    // Start new week on Sunday
    if (i === 0) {
      // Pad beginning with empty days
      for (let j = 0; j < dayOfWeek; j++) {
        currentWeek.push(emptyDay);
      }
    }

    currentWeek.push(day);

    if (dayOfWeek === 6 || i === sortedData.length - 1) {
      // Pad end with empty days
      while (currentWeek.length < 7) {
        currentWeek.push(emptyDay);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (weeks.length === 0) {
    return <div className="text-gray-500 text-center py-4">No contribution data</div>;
  }

  const handleMouseEnter = (e: React.MouseEvent, day: DailyContribution) => {
    if (!day.date) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const date = new Date(day.date);
    const weekNum = `W${getISOWeekNumber(date).toString().padStart(2, '0')}`;
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      date: formatDate(day.date),
      count: day.count,
      weekNum,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="overflow-x-auto relative">
      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-medium">{tooltip.date}</div>
          <div className="text-gray-300">
            {tooltip.weekNum} · {tooltip.count.toLocaleString()} {label}
          </div>
          <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}

      {/* Heatmap grid */}
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => {
              const level = day.level ?? 0;

              return (
                <div
                  key={dayIndex}
                  className={clsx('heatmap-cell cursor-pointer', LEVEL_COLORS[level])}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className={clsx('heatmap-cell', color)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
