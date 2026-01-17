'use client'

import { Sliders, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useCustomFieldDefs } from '@/lib/hooks/useCustomFields'
import { FIELD_TYPE_ICONS } from '@/lib/types/customFields'
import { Button } from '@/components/ui'

export function CustomFieldsSummary() {
  const { data: fields, isLoading } = useCustomFieldDefs('contact')

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    )
  }

  const activeFields = (fields || []).filter(f => f.is_active !== false)
  const aiReadableFields = (activeFields || []).filter(f => f.ai_can_read)
  const aiWritableFields = (activeFields || []).filter(f => f.ai_can_write)

  // Field type breakdown
  const fieldTypes = (activeFields || []).reduce((acc, field) => {
    acc[field.field_type] = (acc[field.field_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topTypes = Object.entries(fieldTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
        </div>
        <Link href="/custom-fields">
          <Button variant="ghost" size="sm">
            Manage <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {activeFields.length === 0 ? (
        /* Empty State */
        <div className="text-center py-6">
          <div className="rounded-full bg-purple-100 w-12 h-12 mx-auto flex items-center justify-center mb-3">
            <Sliders className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 mb-3">No custom fields defined yet</p>
          <Link href="/custom-fields">
            <Button size="sm">Create First Field</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{activeFields.length}</div>
              <div className="text-xs text-gray-500">Total Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{aiReadableFields.length}</div>
              <div className="text-xs text-gray-500">AI Read</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{aiWritableFields.length}</div>
              <div className="text-xs text-gray-500">AI Write</div>
            </div>
          </div>

          {/* Field Types */}
          {topTypes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Most Used Types</div>
              {(topTypes || []).map(([type, count]) => {
                const icon = FIELD_TYPE_ICONS[type as keyof typeof FIELD_TYPE_ICONS]
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="text-gray-700 capitalize">{type}</span>
                    </div>
                    <span className="text-gray-500">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Link */}
          <Link href="/custom-fields">
            <Button variant="secondary" size="sm" className="w-full mt-4">
              View All Fields
            </Button>
          </Link>
        </>
      )}
    </div>
  )
}
