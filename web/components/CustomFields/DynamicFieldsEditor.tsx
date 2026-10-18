'use client'

import { useState, useEffect } from 'react'
import { useActiveCustomFields, useCustomFieldValues, useUpdateCustomFieldValues } from '@/lib/hooks/useCustomFields'
import { CustomFieldDefinition, CustomFieldValue } from '@/lib/types/customFields'
import { Input, Select, Textarea, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface DynamicFieldsEditorProps {
  contactId: string
  onSave?: () => void
  className?: string
}

export function DynamicFieldsEditor({ contactId, onSave, className }: DynamicFieldsEditorProps) {
  const { showToast } = useToast()
  const { data: fieldDefs, isLoading: loadingDefs } = useActiveCustomFields('contact')
  const { data: currentValues } = useCustomFieldValues(contactId)
  const updateValues = useUpdateCustomFieldValues()

  const [values, setValues] = useState<CustomFieldValue>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize values when data loads
  useEffect(() => {
    if (currentValues) {
      setValues(currentValues)
    }
  }, [currentValues])

  const handleChange = (fieldKey: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateValues.mutateAsync({ contactId, values })
      showToast('success', 'Custom fields updated')
      setHasChanges(false)
      onSave?.()
    } catch (error) {
      showToast('error', 'Failed to update custom fields')
    }
  }

  const handleReset = () => {
    setValues(currentValues || {})
    setHasChanges(false)
  }

  if (loadingDefs) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!fieldDefs || fieldDefs.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <p className="text-sm">No custom fields defined</p>
        <p className="text-xs mt-1">Add custom fields in Settings</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {fieldDefs.map(field => (
        <FieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => handleChange(field.key, value)}
        />
      ))}

      {hasChanges && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={updateValues.isPending}
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
}

// Individual field input component
function FieldInput({ 
  field, 
  value, 
  onChange 
}: { 
  field: CustomFieldDefinition
  value: any
  onChange: (value: any) => void
}) {
  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Input
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
            required={field.validation?.required}
            placeholder={field.description}
          />
        )

      case 'textarea':
        return (
          <Textarea
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.validation?.required}
            placeholder={field.description}
            rows={3}
          />
        )

      case 'number':
      case 'integer':
      case 'currency':
        return (
          <Input
            label={field.label}
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : 
                field.field_type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value)
              onChange(val)
            }}
            type="number"
            step={field.field_type === 'integer' ? '1' : 'any'}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.validation?.required}
            placeholder={field.description}
          />
        )

      case 'boolean':
        return (
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">{field.label}</span>
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1 ml-6">{field.description}</p>
            )}
          </div>
        )

      case 'date':
        return (
          <Input
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            type="date"
            required={field.validation?.required}
          />
        )

      case 'datetime':
        return (
          <Input
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            type="datetime-local"
            required={field.validation?.required}
          />
        )

      case 'select':
        return (
          <Select
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            options={[
              { value: '', label: '-- Select --' },
              ...(field.validation?.options || []).map(opt => ({ value: opt, label: opt }))
            ]}
            required={field.validation?.required}
          />
        )

      case 'multiselect':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(field.validation?.options || []).map(option => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = value || []
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option)
                      onChange(newValues)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        )

      case 'rating':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating)}
                  className={cn(
                    'text-2xl transition-colors',
                    rating <= (value || 0) ? 'text-yellow-400' : 'text-gray-300'
                  )}
                >
                  ★
                </button>
              ))}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        )

      default:
        return (
          <Input
            label={field.label}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.description}
          />
        )
    }
  }

  return <div>{renderInput()}</div>
}
