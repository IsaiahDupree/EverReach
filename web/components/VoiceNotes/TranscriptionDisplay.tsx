import { FileText, User, Calendar } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface TranscriptionSegment {
  speaker?: string
  text: string
  timestamp?: number
  confidence?: number
}

interface TranscriptionDisplayProps {
  transcription: string | TranscriptionSegment[]
  metadata?: {
    duration?: number
    language?: string
    created_at?: string
  }
  className?: string
}

export function TranscriptionDisplay({ 
  transcription, 
  metadata,
  className 
}: TranscriptionDisplayProps) {
  const isSegmented = Array.isArray(transcription)

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <FileText className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Transcription</h3>
        {metadata?.language && (
          <span className="ml-auto text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            {metadata.language.toUpperCase()}
          </span>
        )}
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          {metadata.duration && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{Math.floor(metadata.duration / 60)}m {Math.floor(metadata.duration % 60)}s</span>
            </div>
          )}
          {metadata.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDateTime(metadata.created_at)}</span>
            </div>
          )}
        </div>
      )}

      {/* Transcription Content */}
      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
        {isSegmented ? (
          <div className="space-y-4">
            {transcription.map((segment, index) => (
              <div key={index} className="flex gap-3">
                {segment.speaker && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  {segment.speaker && (
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      {segment.speaker}
                      {segment.timestamp !== undefined && (
                        <span className="ml-2 text-gray-400">
                          {formatTimestamp(segment.timestamp)}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {segment.text}
                  </p>
                  {segment.confidence !== undefined && segment.confidence < 0.8 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Low confidence ({Math.round(segment.confidence * 100)}%)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {transcription}
          </p>
        )}
      </div>

      {/* Copy Button */}
      <button
        onClick={() => {
          const text = isSegmented 
            ? transcription.map(s => s.text).join('\n\n')
            : transcription
          navigator.clipboard.writeText(text)
        }}
        className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Copy transcription
      </button>
    </div>
  )
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
