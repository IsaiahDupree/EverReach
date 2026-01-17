'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react'
import { useContextBundle } from '@/lib/hooks/useContextBundle'
import { cn } from '@/lib/utils'

interface ContextPreviewProps {
  contactId: string
  interactions?: number
  className?: string
}

export function ContextPreview({ contactId, interactions = 20, className }: ContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: bundle, isLoading, error } = useContextBundle(contactId, { interactions })

  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4', className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)}>
        <p className="text-sm text-red-700">Failed to load context</p>
      </div>
    )
  }

  const { contact, context, interactions: recentInteractions, meta } = bundle

  return (
    <div className={cn('rounded-lg border border-blue-200 bg-blue-50', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-medium text-blue-900">AI Context Available</div>
            <div className="text-xs text-blue-700 mt-0.5">
              {recentInteractions?.length || 0} interactions · {meta.token_estimate} tokens
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-blue-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-blue-600" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Flags */}
          {(context.flags.dnc || context.flags.requires_approval) && (
            <div className="space-y-2">
              {context.flags.dnc && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-100 px-3 py-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Do Not Contact</span>
                </div>
              )}
              {context.flags.requires_approval && (
                <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-100 px-3 py-2 rounded">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Requires Approval</span>
                </div>
              )}
            </div>
          )}

          {/* Prompt Skeleton */}
          <div className="bg-white rounded p-3">
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Quick Context Summary
            </div>
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
              {context.prompt_skeleton}
            </pre>
          </div>

          {/* Brand Rules */}
          {context.brand_rules && (context.brand_rules.do || context.brand_rules.dont) && (
            <div className="bg-white rounded p-3 space-y-2">
              <div className="text-xs font-medium text-gray-700">Communication Guidelines</div>
              
              {context.brand_rules.tone && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Tone:</span> {context.brand_rules.tone}
                </div>
              )}

              {context.brand_rules.do && context.brand_rules.do.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-green-700">Do:</span>
                  <ul className="mt-1 space-y-0.5 ml-4 list-disc text-gray-600">
                    {context.brand_rules.do.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {context.brand_rules.dont && context.brand_rules.dont.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium text-red-700">Don't:</span>
                  <ul className="mt-1 space-y-0.5 ml-4 list-disc text-gray-600">
                    {context.brand_rules.dont.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Preferred Channel */}
          {context.preferred_channel && (
            <div className="bg-white rounded p-3">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Preferred Channel:</span>{' '}
                <span className="capitalize">{context.preferred_channel}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white rounded p-2">
              <div className="text-gray-500">Warmth Score</div>
              <div className="font-medium text-gray-900">
                {contact.warmth_score || 'N/A'} {contact.warmth_band && `(${contact.warmth_band})`}
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="text-gray-500">Last Contact</div>
              <div className="font-medium text-gray-900">
                {contact.last_touch_at
                  ? new Date(contact.last_touch_at).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
