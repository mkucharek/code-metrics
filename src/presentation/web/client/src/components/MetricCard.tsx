interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function MetricCard({ label, value, subtext }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}
