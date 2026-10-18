'use client'

import { Edit, Trash2, Plus } from 'lucide-react'
import { useCustomFieldDefs, useDeleteCustomFieldDef } from '@/lib/hooks/useCustomFields'
import { CustomFieldDefinition, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS } from '@/lib/types/customFields'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface FieldDefinitionsListProps {
  onEdit: (field: CustomFieldDefinition) => void
  onNew: () => void
  entity?: 'contact' | 'interaction'
}

export function FieldDefinitionsList({ 
  onEdit, 
  onNew,
  entity = 'contact' 
}: FieldDefinitionsListProps) {
  const { showToast } = useToast()
  const { data: fields, isLoading } = useCustomFieldDefs(entity)
  const deleteField = useDeleteCustomFieldDef()

  const handleDelete = async (field: CustomFieldDefinition) => {
    if (!confirm(`Delete field "${field.label}"? This will remove all data for this field.`)) {
      return
    }

    try {
      await deleteField.mutateAsync({ id: field.id, entity: field.entity })
      showToast('success', 'Field deleted')
    } catch (error) {
      showToast('error', 'Failed to delete field')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-600 mb-4">No custom fields defined yet</p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create First Field
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(fields || []).map(field => (
        <FieldCard
          key={field.id}
          field={field}
          onEdit={() => onEdit(field)}
          onDelete={() => handleDelete(field)}
          isDeleting={deleteField.isPending}
        />
      ))}
    </div>
  )
}

function FieldCard({ 
  field, 
  onEdit, 
  onDelete,
  isDeleting 
}: { 
  field: CustomFieldDefinition
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const icon = FIELD_TYPE_ICONS[field.field_type]
  const typeLabel = FIELD_TYPE_LABELS[field.field_type]

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow',
      field.is_active === false && 'opacity-60'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="font-medium text-gray-900">{field.label}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                  {field.key}
                </code>
                <span className="text-xs text-gray-500">{typeLabel}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {field.description && (
            <p className="text-sm text-gray-600 mb-3">{field.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {field.validation?.required && (
              <Badge color="red">Required</Badge>
            )}
            {field.validation?.unique && (
              <Badge color="purple">Unique</Badge>
            )}
            {field.is_indexed && (
              <Badge color="blue">Indexed</Badge>
            )}
            {field.ai_can_read && (
              <Badge color="green">AI Read</Badge>
            )}
            {field.ai_can_write && (
              <Badge color="green">AI Write</Badge>
            )}
            {field.pii_level && field.pii_level !== 'none' && (
              <Badge color="yellow">PII: {field.pii_level}</Badge>
            )}
            {field.is_active === false && (
              <Badge color="gray">Inactive</Badge>
            )}
          </div>

          {/* Options for select fields */}
          {field.validation?.options && field.validation.options.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">Options:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {field.validation.options.slice(0, 5).map((opt, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                    {opt}
                  </span>
                ))}
                {field.validation.options.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{field.validation.options.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit field"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete field"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors = {
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-gray-100 text-gray-700',
  }

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', colors[color as keyof typeof colors])}>
      {children}
    </span>
  )
}
