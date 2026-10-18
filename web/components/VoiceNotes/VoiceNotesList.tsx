'use client'

import { Mic, Trash2, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useVoiceNotes, useDeleteVoiceNote } from '@/lib/hooks/useVoiceNotes'
import { AudioPlayer } from './AudioPlayer'
import { TranscriptionDisplay } from './TranscriptionDisplay'
import { ProcessingStatus } from './ProcessingStatus'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

export function VoiceNotesList() {
  const { showToast } = useToast()
  const { data: notes, isLoading, error } = useVoiceNotes()
  const deleteMutation = useDeleteVoiceNote()

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete voice note "${title}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(id)
      showToast('success', 'Voice note deleted')
    } catch (error) {
      showToast('error', 'Failed to delete voice note')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">Failed to load voice notes</p>
      </div>
    )
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="rounded-full bg-gray-200 w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Mic className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium">No voice notes yet</p>
        <p className="text-sm text-gray-500 mt-1">Upload your first voice note above</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <VoiceNoteCard
          key={note.id}
          note={note}
          onDelete={() => handleDelete(note.id, note.title)}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  )
}

function VoiceNoteCard({
  note,
  onDelete,
  isDeleting,
}: {
  note: any
  onDelete: () => void
  isDeleting: boolean
}) {
  const getStatusIcon = () => {
    switch (note.processing_status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (note.processing_status) {
      case 'completed':
        return 'Transcribed'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded bg-blue-100 p-2 flex-shrink-0">
              <Mic className="h-4 w-4 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  {getStatusIcon()}
                  {getStatusText()}
                </span>
                <span>•</span>
                <span>{formatDateTime(note.created_at)}</span>
                {note.duration_seconds && (
                  <>
                    <span>•</span>
                    <span>{Math.round(note.duration_seconds)}s</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete voice note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {note.file_url && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <AudioPlayer src={note.file_url} />
        </div>
      )}

      {/* Processing Status */}
      {note.processing_status && note.processing_status !== 'completed' && (
        <div className="p-4 border-b border-gray-200">
          <ProcessingStatus status={note.processing_status} />
        </div>
      )}

      {/* Transcription */}
      {note.transcription && (
        <div className="p-4">
          <TranscriptionDisplay transcription={note.transcription} />
        </div>
      )}
    </div>
  )
}
