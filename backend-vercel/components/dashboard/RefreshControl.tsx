'use client';

import { RefreshCw } from 'lucide-react';

interface Props {
  value: number; // seconds, 0 = off
  onChange: (value: number) => void;
}

const OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
];

export function RefreshControl({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
      <RefreshCw className="w-4 h-4 text-gray-600 ml-2" />
      
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        
        return (
          <button
            key={option.label}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
