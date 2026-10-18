'use client';

interface Props {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
}

const RANGES = [
  { label: '1 Hour', value: { from: 'now-1h', to: 'now' } },
  { label: '24 Hours', value: { from: 'now-24h', to: 'now' } },
  { label: '7 Days', value: { from: 'now-7d', to: 'now' } },
  { label: '30 Days', value: { from: 'now-30d', to: 'now' } },
];

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
      {RANGES.map((range) => {
        const isActive = value.from === range.value.from;
        
        return (
          <button
            key={range.label}
            onClick={() => onChange(range.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
