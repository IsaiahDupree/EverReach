'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useUploadFile } from '@/lib/hooks/useFiles'
import { useToast } from '@/components/ui/Toast'
import { formatFileSize } from '@/lib/types/files'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  contactId?: string
  onUploadComplete?: () => void
}

export function FileUpload({ contactId, onUploadComplete }: FileUploadProps) {
  const { showToast } = useToast()
  const upload = useUploadFile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      for (const file of selectedFiles) {
        await upload.mutateAsync({ file, contactId })
      }
      
      showToast('success', `Uploaded ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}`)
      setSelectedFiles([])
      onUploadComplete?.()
    } catch (error) {
      showToast('error', 'Failed to upload files')
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-gray-200 p-4">
            <Upload className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <p className="text-gray-700 font-medium">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports documents, images, PDFs, and more
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Selected Files</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl">📎</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{file.name}</div>
                    <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setSelectedFiles([])}
              disabled={upload.isPending}
            >
              Clear All
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={upload.isPending}
            >
              Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
