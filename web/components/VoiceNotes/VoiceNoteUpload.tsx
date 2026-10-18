'use client'

import { useState, useRef } from 'react'
import { Upload, Mic, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useUploadVoiceNote, useTranscribeVoiceNote } from '@/lib/hooks/useVoiceNotes'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface VoiceNoteUploadProps {
  onSuccess?: () => void
  className?: string
}

export function VoiceNoteUpload({ onSuccess, className }: VoiceNoteUploadProps) {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'transcribing'>('idle')

  const uploadMutation = useUploadVoiceNote()
  const transcribeMutation = useTranscribeVoiceNote()

  const handleFileSelect = (file: File | null) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|m4a|wav|ogg|webm|aac)$/i)) {
      showToast('error', 'Please select an audio file')
      return
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast('error', 'File too large. Maximum size is 50MB')
      return
    }

    setSelectedFile(file)
  }

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

    const file = e.dataTransfer.files[0]
    handleFileSelect(file || null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadProgress('uploading')

      // Upload file
      const note = await uploadMutation.mutateAsync(selectedFile)
      
      showToast('success', 'Voice note uploaded')

      // Start transcription
      setUploadProgress('transcribing')
      await transcribeMutation.mutateAsync(note.id)

      showToast('success', 'Transcription started')
      setSelectedFile(null)
      setUploadProgress('idle')
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      showToast('error', message)
      setUploadProgress('idle')
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setUploadProgress('idle')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isProcessing = uploadProgress !== 'idle'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-blue-100 p-4">
              <Mic className="h-8 w-8 text-blue-600" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragging ? 'Drop audio file here' : 'Upload Voice Note'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or click to browse
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Supported: MP3, M4A, WAV, OGG, WebM, AAC</span>
              <span>•</span>
              <span>Max 50MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !isProcessing && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="rounded bg-blue-100 p-2">
              <Mic className="h-5 w-5 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || transcribeMutation.isPending}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload & Transcribe
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={uploadMutation.isPending || transcribeMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            <div>
              <p className="font-medium text-blue-900">
                {uploadProgress === 'uploading' && 'Uploading voice note...'}
                {uploadProgress === 'transcribing' && 'Starting transcription...'}
              </p>
              <p className="text-sm text-blue-700 mt-0.5">
                {selectedFile?.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
