'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, Calendar, MessageSquare, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useContactAnalysis } from '@/lib/hooks/useContactAnalysis'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ContactAnalysisPanelProps {
  contactId: string
  className?: string
}

export function ContactAnalysisPanel({ contactId, className }: ContactAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: analysis, isLoading, error, refetch } = useContactAnalysis(contactId, 'full_analysis')

  if (!isExpanded) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4', className)}>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">AI Relationship Analysis</span>
          </div>
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-6 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">AI Relationship Analysis</span>
          </div>
          <button onClick={() => setIsExpanded(false)}>
            <ChevronUp className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-900">Analysis Failed</span>
          </div>
          <button onClick={() => setIsExpanded(false)}>
            <ChevronUp className="h-5 w-5 text-red-400" />
          </button>
        </div>
        <p className="text-sm text-red-700 mb-4">
          Failed to generate AI analysis. Please try again.
        </p>
        <Button size="sm" onClick={() => refetch()}>
          Retry Analysis
        </Button>
      </div>
    )
  }

  const health = analysis.relationship_health
  const suggestions = analysis.engagement_suggestions || []

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Relationship Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetch()}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <button onClick={() => setIsExpanded(false)}>
            <ChevronUp className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Relationship Health */}
      {health && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Relationship Health</h4>
            <div className="flex items-center gap-2">
              {health.trend === 'improving' && (
                <TrendingUp className="h-5 w-5 text-green-600" />
              )}
              {health.trend === 'declining' && (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              {health.trend === 'stable' && (
                <Minus className="h-5 w-5 text-gray-600" />
              )}
              <span
                className={cn(
                  'text-2xl font-bold',
                  health.score >= 70 ? 'text-green-600' :
                  health.score >= 40 ? 'text-yellow-600' :
                  'text-red-600'
                )}
              >
                {health.score}/100
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-700">{health.summary}</p>

          {/* Health Factors */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(health.factors).map(([key, value]) => {
              const numValue = Number(value)
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          numValue >= 70 ? 'bg-green-500' :
                          numValue >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                        )}
                        style={{ width: `${numValue}%` }}
                      />
                    </div>
                    <span className="font-medium text-gray-900 w-8 text-right">
                      {numValue}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Engagement Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Suggested Actions</h4>
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const Icon = 
                suggestion.type === 'reach_out' ? MessageSquare :
                suggestion.type === 'follow_up' ? CheckCircle :
                suggestion.type === 'celebrate' ? Sparkles :
                Calendar

              const priorityColors: Record<'high' | 'medium' | 'low', string> = {
                high: 'border-red-200 bg-red-50',
                medium: 'border-yellow-200 bg-yellow-50',
                low: 'border-gray-200 bg-gray-50',
              }

              return (
                <div
                  key={suggestion.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-2',
                    priorityColors[suggestion.priority]
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {suggestion.type.replace('_', ' ')}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          )}
                        >
                          {suggestion.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.reason}</p>
                      {suggestion.timing && (
                        <p className="text-xs text-gray-600">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {suggestion.timing}
                        </p>
                      )}
                      {suggestion.suggested_message && (
                        <div className="mt-2 text-xs text-gray-600 italic border-l-2 border-gray-300 pl-3">
                          "{suggestion.suggested_message}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Context Summary */}
      {analysis.context_summary && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="font-medium text-blue-900 mb-2">Quick Context</h4>
          <p className="text-sm text-blue-800">{analysis.context_summary}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Generated: {new Date(analysis.generated_at).toLocaleString()}
      </div>
    </div>
  )
}
