'use client'

import { X, Tags, Eye, Trash2, Download, GitBranch } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onAddTags: () => void
  onSetWatch: () => void
  onAddToPipeline: () => void
  onExport: () => void
  onDelete: () => void
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onAddTags,
  onSetWatch,
  onAddToPipeline,
  onExport,
  onDelete,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-6">
        {/* Selection Count */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {selectedCount}
          </div>
          <span className="font-medium">
            {selectedCount} {selectedCount === 1 ? 'contact' : 'contacts'} selected
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTags}
            className="px-3 py-2 hover:bg-gray-800 rounded transition-colors flex items-center gap-2 text-sm"
            title="Add tags"
          >
            <Tags className="h-4 w-4" />
            <span>Tags</span>
          </button>

          <button
            onClick={onSetWatch}
            className="px-3 py-2 hover:bg-gray-800 rounded transition-colors flex items-center gap-2 text-sm"
            title="Set watch"
          >
            <Eye className="h-4 w-4" />
            <span>Watch</span>
          </button>

          <button
            onClick={onAddToPipeline}
            className="px-3 py-2 hover:bg-gray-800 rounded transition-colors flex items-center gap-2 text-sm"
            title="Add to pipeline"
          >
            <GitBranch className="h-4 w-4" />
            <span>Pipeline</span>
          </button>

          <button
            onClick={onExport}
            className="px-3 py-2 hover:bg-gray-800 rounded transition-colors flex items-center gap-2 text-sm"
            title="Export"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>

          <button
            onClick={onDelete}
            className="px-3 py-2 hover:bg-red-700 rounded transition-colors flex items-center gap-2 text-sm text-red-400 hover:text-white"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-2 hover:bg-gray-800 rounded transition-colors"
          title="Clear selection"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
