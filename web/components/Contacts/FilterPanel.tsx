"use client"

import { Button } from '@/components/ui'

interface FilterPanelProps {
  warmthFilter: string | null
  onWarmthChange: (warmth: string | null) => void
  watchFilter: string | null
  onWatchChange: (watch: string | null) => void
}

export function FilterPanel({
  warmthFilter,
  onWarmthChange,
  watchFilter,
  onWatchChange,
}: FilterPanelProps) {
  const warmthOptions = [
    { value: 'hot', label: 'Hot', color: 'bg-teal-500' },
    { value: 'warm', label: 'Warm', color: 'bg-yellow-400' },
    { value: 'cool', label: 'Cool', color: 'bg-blue-300' },
    { value: 'cold', label: 'Cold', color: 'bg-red-500' },
  ]

  const watchOptions = [
    { value: 'vip', label: 'VIP' },
    { value: 'important', label: 'Important' },
    { value: 'watch', label: 'Watch' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Warmth Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Warmth:</span>
        <div className="flex gap-1">
          <button
            onClick={() => onWarmthChange(null)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              !warmthFilter
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {warmthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onWarmthChange(option.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
                warmthFilter === option.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${option.color}`} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Watch Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Watch Status:</span>
        <div className="flex gap-1">
          <button
            onClick={() => onWatchChange(null)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              !watchFilter
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {watchOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onWatchChange(option.value)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                watchFilter === option.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(warmthFilter || watchFilter) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onWarmthChange(null)
            onWatchChange(null)
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
