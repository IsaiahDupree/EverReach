import { getWarmthLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface WarmthScoreProps {
  warmth: number | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function WarmthScore({ 
  warmth, 
  size = 'md', 
  showLabel = true,
  className 
}: WarmthScoreProps) {
  const label = getWarmthLabel(warmth)
  const score = warmth ?? 0
  const percentage = Math.min(Math.max(score, 0), 100)
  
  const sizeMap = {
    sm: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-sm' },
    lg: { container: 'w-40 h-40', text: 'text-4xl', label: 'text-base' },
  }
  
  const sizes = sizeMap[size]
  
  // SVG circle properties
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  // Color based on warmth
  const getStrokeColor = () => {
    if (warmth == null) return '#9ca3af' // gray
    if (warmth >= 70) return '#14b8a6' // teal (hot)
    if (warmth >= 40) return '#fbbf24' // yellow (warm)
    if (warmth >= 20) return '#60a5fa' // blue (cool)
    return '#ef4444' // red (cold)
  }

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div className={cn('relative', sizes.container)}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold text-gray-900', sizes.text)}>
            {warmth ?? '—'}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      
      {showLabel && (
        <span className={cn('font-medium text-gray-700', sizes.label)}>
          {label}
        </span>
      )}
    </div>
  )
}
