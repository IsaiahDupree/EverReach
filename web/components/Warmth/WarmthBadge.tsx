import { getWarmthColor, getWarmthLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface WarmthBadgeProps {
  warmth: number | null | undefined
  showLabel?: boolean
  showScore?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function WarmthBadge({ 
  warmth, 
  showLabel = true, 
  showScore = false,
  size = 'md',
  className 
}: WarmthBadgeProps) {
  const label = getWarmthLabel(warmth)
  const colorClass = getWarmthColor(warmth)
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium text-white',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {showLabel && <span>{label}</span>}
      {showScore && warmth != null && <span>({warmth})</span>}
    </span>
  )
}
