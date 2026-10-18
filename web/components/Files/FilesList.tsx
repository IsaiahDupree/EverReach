'use client'

import { useState } from 'react'
import { Download, Trash2, FileIcon } from 'lucide-react'
import { useFiles, useDeleteFile } from '@/lib/hooks/useFiles'
import { UploadedFile, FILE_CATEGORIES, formatFileSize } from '@/lib/types/files'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface FilesListProps {
  contactId?: string
}

export function FilesList({ contactId }: FilesListProps) {
  const { showToast } = useToast()
  const { data: files, isLoading } = useFiles(contactId)
  const deleteFile = useDeleteFile()

  const [filter, setFilter] = useState<string>('all')

  const filteredFiles = files?.filter(file => 
    filter === 'all' || file.category === filter
  ) || []

  const handleDelete = async (file: UploadedFile) => {
    if (!confirm(`Delete "${file.original_filename}"?`)) return

    try {
      await deleteFile.mutateAsync(file.id)
      showToast('success', 'File deleted')
    } catch (error) {
      showToast('error', 'Failed to delete file')
    }
  }

  const handleDownload = (file: UploadedFile) => {
    if (file.public_url) {
      window.open(file.public_url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No files uploaded yet
      </div>
    )
  }

  // Get unique categories from files
  const categories = Array.from(new Set(files.map(f => f.category)))

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            All ({files.length})
          </button>
          {categories.map(category => {
            const count = files.filter(f => f.category === category).length
            const categoryInfo = FILE_CATEGORIES[category]
            
            return (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  filter === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {categoryInfo.icon} {categoryInfo.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map(file => (
          <FileCard
            key={file.id}
            file={file}
            onDelete={() => handleDelete(file)}
            onDownload={() => handleDownload(file)}
            isDeleting={deleteFile.isPending}
          />
        ))}
      </div>
    </div>
  )
}

function FileCard({
  file,
  onDelete,
  onDownload,
  isDeleting,
}: {
  file: UploadedFile
  onDelete: () => void
  onDownload: () => void
  isDeleting: boolean
}) {
  const categoryInfo = FILE_CATEGORIES[file.category]
  const isImage = file.category === 'image'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Preview */}
      <div className="mb-3">
        {isImage && file.thumbnail_url ? (
          <img
            src={file.thumbnail_url}
            alt={file.original_filename}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-5xl">{categoryInfo.icon}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 truncate" title={file.original_filename}>
          {file.original_filename}
        </h4>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatFileSize(file.size_bytes)}</span>
          <span className="capitalize">{categoryInfo.label}</span>
        </div>

        {file.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{file.description}</p>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {file.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{file.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400">
          {formatDateTime(file.uploaded_at)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        {file.public_url && (
          <button
            onClick={onDownload}
            className="flex-1 py-2 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="py-2 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
