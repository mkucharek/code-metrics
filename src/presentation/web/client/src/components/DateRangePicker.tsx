interface DateRangeValue {
  since: string;
  until?: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const presets = [
  { label: 'Last 7 days', since: '7' },
  { label: 'Last 30 days', since: '30' },
  { label: 'Last 90 days', since: '90' },
  { label: 'Last 6 months', since: '180' },
  { label: 'Last year', since: '365' },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <select
      value={value.since}
      onChange={(e) => onChange({ since: e.target.value })}
      name="dateRange"
      aria-label="Select date range"
      className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
    >
      {presets.map((preset) => (
        <option key={preset.since} value={preset.since}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}
