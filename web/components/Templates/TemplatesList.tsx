'use client'

import { Edit, Trash2, Copy, Eye } from 'lucide-react'
import { useTemplates, useDeleteTemplate } from '@/lib/hooks/useTemplates'
import { MessageTemplate, TEMPLATE_CATEGORIES } from '@/lib/types/templates'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TemplatesListProps {
  onEdit: (template: MessageTemplate) => void
  onNew: () => void
}

export function TemplatesList({ onEdit, onNew }: TemplatesListProps) {
  const { showToast } = useToast()
  const { data: templates, isLoading } = useTemplates({ active_only: false })
  const deleteTemplate = useDeleteTemplate()
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)

  const handleDelete = async (template: MessageTemplate) => {
    if (!confirm(`Delete template "${template.name}"?`)) {
      return
    }

    try {
      await deleteTemplate.mutateAsync(template.id)
      showToast('success', 'Template deleted')
    } catch (error) {
      showToast('error', 'Failed to delete template')
    }
  }

  const handleDuplicate = (template: MessageTemplate) => {
    // Create a new template based on this one
    const newTemplate = {
      ...template,
      name: `${template.name} (Copy)`,
      id: '', // Will be generated
      use_count: 0,
    }
    onEdit(newTemplate as MessageTemplate)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-600 mb-4">No templates yet</p>
        <Button onClick={onNew}>Create First Template</Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={() => onEdit(template)}
            onDelete={() => handleDelete(template)}
            onDuplicate={() => handleDuplicate(template)}
            onPreview={() => setPreviewTemplate(template)}
            isDeleting={deleteTemplate.isPending}
          />
        ))}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </>
  )
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  isDeleting,
}: {
  template: MessageTemplate
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onPreview: () => void
  isDeleting: boolean
}) {
  const category = TEMPLATE_CATEGORIES[template.category]

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow',
      !template.is_active && 'opacity-60 bg-gray-50'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{category.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="capitalize">{template.channel}</span>
                {template.use_count > 0 && (
                  <>
                    <span>•</span>
                    <span>Used {template.use_count} times</span>
                  </>
                )}
                {!template.is_active && (
                  <>
                    <span>•</span>
                    <span className="text-yellow-600">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
          )}

          {/* Preview */}
          <div className="text-sm text-gray-500 line-clamp-2 bg-gray-50 p-2 rounded">
            {template.body}
          </div>

          {/* Variables */}
          {template.variables && template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.variables.map((variable) => (
                <span
                  key={variable}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono"
                >
                  {'{{'}{variable}{'}}'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-4">
          <button
            onClick={onPreview}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Preview template"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Duplicate template"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit template"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete template"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: MessageTemplate
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
              {template.description && (
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {template.subject && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <div className="mt-1 text-gray-900">{template.subject}</div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Message Body</label>
            <div className="mt-1 whitespace-pre-wrap text-gray-900 bg-gray-50 p-4 rounded">
              {template.body}
            </div>
          </div>

          {template.variables && template.variables.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Variables Used</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {template.variables.map((variable) => (
                  <span
                    key={variable}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono"
                  >
                    {'{{'}{variable}{'}}'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
