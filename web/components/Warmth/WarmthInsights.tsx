import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface WarmthInsightsProps {
  warmth: number | null | undefined
  lastInteraction?: string | null
  interactionCount?: number
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export function WarmthInsights({ 
  warmth, 
  lastInteraction,
  interactionCount = 0,
  trend = 'stable',
  className 
}: WarmthInsightsProps) {
  const score = warmth ?? 0
  
  const getRecommendation = () => {
    if (warmth == null) {
      return {
        icon: AlertCircle,
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        title: 'No warmth data',
        message: 'Log interactions to start tracking relationship warmth.',
      }
    }
    
    if (score >= 70) {
      return {
        icon: CheckCircle,
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        title: 'Strong relationship',
        message: 'This relationship is thriving! Keep up the regular engagement.',
      }
    }
    
    if (score >= 40) {
      return {
        icon: CheckCircle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        title: 'Healthy connection',
        message: 'The relationship is warm. Consider reaching out to maintain momentum.',
      }
    }
    
    if (score >= 20) {
      return {
        icon: AlertCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        title: 'Needs attention',
        message: 'This relationship is cooling. Schedule a catch-up soon.',
      }
    }
    
    return {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      title: 'Re-engagement needed',
      message: 'This relationship has gone cold. Reach out to reconnect.',
    }
  }

  const recommendation = getRecommendation()
  const Icon = recommendation.icon
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <div className={className}>
      {/* Main Insight Card */}
      <div className={`rounded-lg border p-4 ${recommendation.bg}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${recommendation.color}`} />
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${recommendation.color} mb-1`}>
              {recommendation.title}
            </h3>
            <p className="text-sm text-gray-700">
              {recommendation.message}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Last Contact */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Last Contact</p>
          <p className="text-sm font-semibold text-gray-900">
            {lastInteraction ? formatRelativeTime(lastInteraction) : 'Never'}
          </p>
        </div>

        {/* Interaction Count */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Interactions</p>
          <p className="text-sm font-semibold text-gray-900">
            {interactionCount}
          </p>
        </div>

        {/* Trend */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Trend</p>
          <div className="flex items-center justify-center gap-1">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-sm font-semibold ${trendColor} capitalize`}>
              {trend}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
