'use client'

import { useActiveCustomFields, useCustomFieldValues } from '@/lib/hooks/useCustomFields'
import { FIELD_TYPE_ICONS } from '@/lib/types/customFields'
import { cn } from '@/lib/utils'

interface CustomFieldsDisplayProps {
  contactId: string
  className?: string
}

export function CustomFieldsDisplay({ contactId, className }: CustomFieldsDisplayProps) {
  const { data: fieldDefs, isLoading: loadingDefs } = useActiveCustomFields('contact')
  const { data: values, isLoading: loadingValues } = useCustomFieldValues(contactId)

  if (loadingDefs || loadingValues) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!fieldDefs || fieldDefs.length === 0) {
    return null
  }

  // Filter to only show fields that have values
  const fieldsWithValues = fieldDefs.filter(field => {
    const value = values?.[field.key]
    return value !== null && value !== undefined && value !== ''
  })

  if (fieldsWithValues.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {fieldsWithValues.map(field => {
        const value = values?.[field.key]
        const icon = FIELD_TYPE_ICONS[field.field_type]

        return (
          <div key={field.key} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700">{field.label}</div>
              <div className="text-gray-900 mt-0.5">
                <FieldValue field={field} value={value} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FieldValue({ field, value }: { field: any; value: any }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">Not set</span>
  }

  switch (field.field_type) {
    case 'boolean':
      return <span>{value ? '✓ Yes' : '✗ No'}</span>

    case 'date':
      return <span>{new Date(value).toLocaleDateString()}</span>

    case 'datetime':
      return <span>{new Date(value).toLocaleString()}</span>

    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((item, idx) => (
            <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-sm">
              {item}
            </span>
          ))}
        </div>
      )

    case 'rating':
      return (
        <div className="flex gap-0.5 text-yellow-400">
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star}>{star <= value ? '★' : '☆'}</span>
          ))}
        </div>
      )

    case 'url':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'phone':
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'currency':
      return <span>${parseFloat(value).toFixed(2)}</span>

    default:
      return <span>{String(value)}</span>
  }
}
