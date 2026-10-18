import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
  className?: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    label: 'Pending',
    description: 'Waiting to be processed',
    animate: false,
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Processing',
    description: 'Transcribing audio...',
    animate: true,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Completed',
    description: 'Transcription ready',
    animate: false,
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Failed',
    description: 'Transcription failed',
    animate: false,
  },
}

export function ProcessingStatus({ 
  status, 
  progress, 
  error, 
  className 
}: ProcessingStatusProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            config.color,
            config.animate && 'animate-spin'
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold', config.color)}>
            {config.label}
          </h4>
          <p className="text-sm text-gray-700 mt-1">
            {error || config.description}
          </p>

          {/* Progress Bar */}
          {status === 'processing' && progress !== undefined && (
            <div className="mt-3">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">{progress}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
