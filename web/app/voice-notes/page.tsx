'use client'

import { useState } from 'react'
import { Mic, Upload as UploadIcon } from 'lucide-react'
import { VoiceNoteUpload } from '@/components/VoiceNotes/VoiceNoteUpload'
import { VoiceNotesList } from '@/components/VoiceNotes/VoiceNotesList'
import RequireAuth from '@/components/RequireAuth'

function VoiceNotesPageContent() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    // Refresh the list after successful upload
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-full bg-blue-100 p-2">
            <Mic className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Voice Notes</h1>
        </div>
        <p className="text-gray-600">
          Upload audio recordings to automatically transcribe and analyze them with AI
        </p>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Upload</strong> audio files (MP3, M4A, WAV, etc.)</li>
          <li>• <strong>Automatic transcription</strong> powered by AI</li>
          <li>• <strong>Extract insights</strong> from your recordings</li>
          <li>• <strong>Link to contacts</strong> and track conversations</li>
        </ul>
      </div>

      {/* Upload Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <UploadIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Upload New Voice Note</h2>
        </div>
        <VoiceNoteUpload onSuccess={handleUploadSuccess} />
      </div>

      {/* List Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Voice Notes</h2>
        <VoiceNotesList key={refreshKey} />
      </div>
    </div>
  )
}

export default function VoiceNotesPage() {
  return (
    <RequireAuth>
      <VoiceNotesPageContent />
    </RequireAuth>
  )
}
