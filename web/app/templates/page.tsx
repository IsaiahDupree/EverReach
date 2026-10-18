'use client'

import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { TemplatesList } from '@/components/Templates/TemplatesList'
import { TemplateForm } from '@/components/Templates/TemplateForm'
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks/useTemplates'
import { MessageTemplate } from '@/lib/types/templates'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'

function TemplatesPageContent() {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>()

  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const handleNew = () => {
    setEditingTemplate(undefined)
    setShowForm(true)
  }

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleSave = async (templateData: Partial<MessageTemplate>) => {
    try {
      if (editingTemplate?.id) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          updates: templateData,
        })
        showToast('success', 'Template updated successfully')
      } else {
        await createTemplate.mutateAsync(templateData as any)
        showToast('success', 'Template created successfully')
      }
      setShowForm(false)
      setEditingTemplate(undefined)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save template')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTemplate(undefined)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-600 mt-1">
              Create reusable message templates with variables
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Info Card */}
      {!showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900 mb-2">About Templates</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Save time</strong> with reusable message templates</li>
            <li>• <strong>Personalize</strong> with variables like {'{{'} first_name {'}}'}</li>
            <li>• <strong>Organize</strong> by category and channel</li>
            <li>• <strong>Track usage</strong> to see what works best</li>
            <li>• <strong>Quick insert</strong> in message composer</li>
          </ul>
        </div>
      )}

      {/* Form or List */}
      {showForm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          <TemplateForm
            template={editingTemplate}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={createTemplate.isPending || updateTemplate.isPending}
          />
        </div>
      ) : (
        <TemplatesList
          onEdit={handleEdit}
          onNew={handleNew}
        />
      )}

      {/* Help Section */}
      {!showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900 mb-3">Available Variables</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <strong>Contact Info:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5 font-mono text-xs">
                <li>• {'{{'} contact_name {'}}'}  </li>
                <li>• {'{{'} first_name {'}}'}</li>
                <li>• {'{{'} last_name {'}}'}</li>
                <li>• {'{{'} company {'}}'}</li>
                <li>• {'{{'} title {'}}'}</li>
                <li>• {'{{'} email {'}}'}</li>
                <li>• {'{{'} phone {'}}'}</li>
              </ul>
            </div>
            <div>
              <strong>Relationship Data:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5 font-mono text-xs">
                <li>• {'{{'} last_interaction_date {'}}'}</li>
                <li>• {'{{'} days_since_contact {'}}'}</li>
                <li>• {'{{'} warmth_score {'}}'}</li>
              </ul>
            </div>
            <div>
              <strong>Your Info:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5 font-mono text-xs">
                <li>• {'{{'} my_name {'}}'}</li>
                <li>• {'{{'} my_company {'}}'}</li>
                <li>• {'{{'} my_title {'}}'}</li>
                <li>• {'{{'} current_date {'}}'}</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Variables will be automatically replaced with actual values when you use the template.
          </p>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <RequireAuth>
      <TemplatesPageContent />
    </RequireAuth>
  )
}
