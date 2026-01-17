'use client'

import { useState } from 'react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { 
  MessageTemplate, 
  TemplateCategory, 
  TemplateChannel,
  TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
  extractVariables
} from '@/lib/types/templates'
import { Info } from 'lucide-react'

interface TemplateFormProps {
  template?: MessageTemplate
  onSave: (template: Partial<MessageTemplate>) => void
  onCancel: () => void
  isSaving?: boolean
}

const categoryOptions = Object.entries(TEMPLATE_CATEGORIES).map(([value, { label, icon }]) => ({
  value,
  label: `${icon} ${label}`,
}))

const channelOptions = [
  { value: 'any', label: 'Any Channel' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'dm', label: 'Direct Message' },
]

export function TemplateForm({ template, onSave, onCancel, isSaving = false }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'other',
    channel: template?.channel || 'any',
    subject: template?.subject || '',
    body: template?.body || '',
    is_active: template?.is_active ?? true,
  })

  const [showVariables, setShowVariables] = useState(false)

  const detectedVariables = extractVariables(formData.body)
  const showSubject = formData.channel === 'email' || formData.channel === 'any'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<MessageTemplate> = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category as TemplateCategory,
      channel: formData.channel as TemplateChannel,
      subject: formData.subject || undefined,
      body: formData.body,
      is_active: formData.is_active,
      variables: detectedVariables,
    }

    onSave(payload)
  }

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="body"]') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.body
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = `${before}{{${variable}}}${after}`

    setFormData({ ...formData, body: newText })

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4
    }, 0)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Basic Information</h3>

        <Input
          label="Template Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Quarterly Check-in"
          helperText="A descriptive name for this template"
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Brief description of when to use this template"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
            options={categoryOptions}
          />

          <Select
            label="Channel"
            required
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value as TemplateChannel })}
            options={channelOptions}
          />
        </div>
      </div>

      {/* Email Subject */}
      {showSubject && (
        <div>
          <Input
            label="Email Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g., Time for a quick catch-up?"
            helperText="Subject line for email messages (optional)"
          />
        </div>
      )}

      {/* Message Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Message Body <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showVariables ? 'Hide' : 'Show'} Variables
          </button>
        </div>

        <Textarea
          name="body"
          required
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={8}
          placeholder="Hi {{first_name}},&#10;&#10;I wanted to reach out..."
        />

        {/* Variables Panel */}
        {showVariables && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Available Variables</p>
                <p className="text-blue-700">
                  Click a variable to insert it at cursor position. Variables will be replaced with actual values when sending.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.key)}
                  className="text-left px-3 py-2 rounded bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
                  title={variable.description}
                >
                  <span className="font-mono text-blue-600">{'{{' + variable.key + '}}'}</span>
                  <span className="text-gray-600 block text-xs mt-0.5">{variable.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detected Variables */}
        {detectedVariables.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Detected variables:</span>{' '}
            {detectedVariables.map((v, i) => (
              <span key={v}>
                <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{'}{v}{'}}'}</code>
                {i < detectedVariables.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Active template</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Inactive templates won't appear in template selectors
        </p>
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
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  )
}
