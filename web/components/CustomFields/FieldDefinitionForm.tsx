'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { 
  CustomFieldDefinition, 
  FieldType, 
  PiiLevel,
  FIELD_TYPE_LABELS,
  PII_LEVEL_LABELS 
} from '@/lib/types/customFields'

interface FieldDefinitionFormProps {
  fieldDef?: CustomFieldDefinition
  onSave: (fieldDef: Partial<CustomFieldDefinition>) => void
  onCancel: () => void
  isSaving?: boolean
}

const fieldTypeOptions = Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const piiLevelOptions = Object.entries(PII_LEVEL_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function FieldDefinitionForm({
  fieldDef,
  onSave,
  onCancel,
  isSaving = false,
}: FieldDefinitionFormProps) {
  const [formData, setFormData] = useState({
    key: fieldDef?.key || '',
    label: fieldDef?.label || '',
    description: fieldDef?.description || '',
    field_type: fieldDef?.field_type || 'text',
    required: fieldDef?.validation?.required || false,
    unique: fieldDef?.validation?.unique || false,
    options: fieldDef?.validation?.options?.join('\n') || '',
    min: fieldDef?.validation?.min?.toString() || '',
    max: fieldDef?.validation?.max?.toString() || '',
    pattern: fieldDef?.validation?.pattern || '',
    default_value: fieldDef?.default_value || '',
    is_indexed: fieldDef?.is_indexed || false,
    ai_can_read: fieldDef?.ai_can_read ?? true,
    ai_can_write: fieldDef?.ai_can_write ?? false,
    pii_level: fieldDef?.pii_level || 'none',
    synonyms: fieldDef?.synonyms?.join(', ') || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validation: any = {}
    if (formData.required) validation.required = true
    if (formData.unique) validation.unique = true
    if (formData.options) validation.options = formData.options.split('\n').map(o => o.trim()).filter(Boolean)
    if (formData.min) validation.min = parseFloat(formData.min)
    if (formData.max) validation.max = parseFloat(formData.max)
    if (formData.pattern) validation.pattern = formData.pattern

    const payload: Partial<CustomFieldDefinition> = {
      entity: 'contact',
      key: formData.key,
      label: formData.label,
      description: formData.description || undefined,
      field_type: formData.field_type as FieldType,
      validation: Object.keys(validation).length > 0 ? validation : undefined,
      default_value: formData.default_value || undefined,
      is_indexed: formData.is_indexed,
      ai_can_read: formData.ai_can_read,
      ai_can_write: formData.ai_can_write,
      pii_level: formData.pii_level as PiiLevel,
      synonyms: formData.synonyms ? formData.synonyms.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    }

    onSave(payload)
  }

  const requiresOptions = formData.field_type === 'select' || formData.field_type === 'multiselect'
  const requiresMinMax = ['number', 'integer', 'rating'].includes(formData.field_type)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Basic Information</h3>
        
        <Input
          label="Field Key"
          required
          value={formData.key}
          onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
          placeholder="e.g., is_vip, customer_tier, last_purchase_date"
          disabled={!!fieldDef} // Can't change key after creation
          helperText="Unique identifier (snake_case, a-z, 0-9, _)"
        />

        <Input
          label="Label"
          required
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="e.g., VIP Status, Customer Tier"
          helperText="Display name shown in UI"
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Brief description of this field"
        />

        <Select
          label="Field Type"
          required
          value={formData.field_type}
          onChange={(e) => setFormData({ ...formData, field_type: e.target.value as FieldType })}
          options={fieldTypeOptions}
          disabled={!!fieldDef} // Can't change type after creation
        />
      </div>

      {/* Validation Rules */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Validation Rules</h3>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Required</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.unique}
              onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Unique</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_indexed}
              onChange={(e) => setFormData({ ...formData, is_indexed: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Indexed (for filtering)</span>
          </label>
        </div>

        {requiresOptions && (
          <Textarea
            label="Options (one per line)"
            required
            value={formData.options}
            onChange={(e) => setFormData({ ...formData, options: e.target.value })}
            rows={4}
            placeholder="Bronze&#10;Silver&#10;Gold&#10;Platinum"
            helperText="For select/multiselect fields"
          />
        )}

        {requiresMinMax && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Value"
              type="number"
              value={formData.min}
              onChange={(e) => setFormData({ ...formData, min: e.target.value })}
            />
            <Input
              label="Max Value"
              type="number"
              value={formData.max}
              onChange={(e) => setFormData({ ...formData, max: e.target.value })}
            />
          </div>
        )}

        {formData.field_type === 'text' && (
          <Input
            label="Pattern (regex)"
            value={formData.pattern}
            onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
            placeholder="^[A-Z]{2,3}$"
            helperText="Optional regex validation"
          />
        )}

        <Input
          label="Default Value"
          value={formData.default_value}
          onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
          placeholder="Default value for new records"
        />
      </div>

      {/* AI & Privacy */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">AI & Privacy Settings</h3>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.ai_can_read}
              onChange={(e) => setFormData({ ...formData, ai_can_read: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">AI can read</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.ai_can_write}
              onChange={(e) => setFormData({ ...formData, ai_can_write: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">AI can write</span>
          </label>
        </div>

        <Select
          label="PII Level"
          value={formData.pii_level}
          onChange={(e) => setFormData({ ...formData, pii_level: e.target.value as PiiLevel })}
          options={piiLevelOptions}
          helperText="Privacy classification for compliance"
        />

        <Input
          label="Synonyms (comma-separated)"
          value={formData.synonyms}
          onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
          placeholder="vip, premium, elite"
          helperText="Alternative names AI can use to reference this field"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={isSaving}
        >
          {fieldDef ? 'Update Field' : 'Create Field'}
        </Button>
      </div>
    </form>
  )
}
