'use client'

import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { FieldDefinitionsList } from '@/components/CustomFields/FieldDefinitionsList'
import { FieldDefinitionForm } from '@/components/CustomFields/FieldDefinitionForm'
import { useCreateCustomFieldDef, useUpdateCustomFieldDef } from '@/lib/hooks/useCustomFields'
import { CustomFieldDefinition } from '@/lib/types/customFields'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'

function CustomFieldsPageContent() {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | undefined>()

  const createField = useCreateCustomFieldDef()
  const updateField = useUpdateCustomFieldDef()

  const handleNew = () => {
    setEditingField(undefined)
    setShowForm(true)
  }

  const handleEdit = (field: CustomFieldDefinition) => {
    setEditingField(field)
    setShowForm(true)
  }

  const handleSave = async (fieldDef: Partial<CustomFieldDefinition>) => {
    try {
      if (editingField) {
        await updateField.mutateAsync({
          id: editingField.id,
          entity: editingField.entity,
          updates: fieldDef,
        })
        showToast('success', 'Field updated successfully')
      } else {
        await createField.mutateAsync(fieldDef as any)
        showToast('success', 'Field created successfully')
      }
      setShowForm(false)
      setEditingField(undefined)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save field')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingField(undefined)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Fields</h1>
            <p className="text-gray-600 mt-1">
              Define custom fields to capture unique data for your contacts
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Field
          </Button>
        )}
      </div>

      {/* Info Card */}
      {!showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900 mb-2">About Custom Fields</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>14 field types</strong> supported (text, number, select, date, etc.)</li>
            <li>• <strong>AI-native</strong> - AI can read/write fields with your permission</li>
            <li>• <strong>Zero-downtime</strong> - Add unlimited fields without schema changes</li>
            <li>• <strong>Validation rules</strong> - Required, unique, patterns, min/max</li>
            <li>• <strong>Privacy controls</strong> - PII classification for compliance</li>
          </ul>
        </div>
      )}

      {/* Form or List */}
      {showForm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {editingField ? 'Edit Field Definition' : 'Create New Field'}
          </h2>
          <FieldDefinitionForm
            fieldDef={editingField}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={createField.isPending || updateField.isPending}
          />
        </div>
      ) : (
        <FieldDefinitionsList
          onEdit={handleEdit}
          onNew={handleNew}
          entity="contact"
        />
      )}

      {/* Help Section */}
      {!showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900 mb-3">Field Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <strong>Text Fields:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• Text (single line)</li>
                <li>• Long Text (multiline)</li>
                <li>• Email</li>
                <li>• Phone</li>
                <li>• URL</li>
              </ul>
            </div>
            <div>
              <strong>Number Fields:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• Number (decimal)</li>
                <li>• Integer (whole)</li>
                <li>• Currency</li>
                <li>• Rating (1-5 stars)</li>
              </ul>
            </div>
            <div>
              <strong>Choice Fields:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• Dropdown (select)</li>
                <li>• Multiple Choice</li>
                <li>• Yes/No (boolean)</li>
              </ul>
            </div>
            <div>
              <strong>Date Fields:</strong>
              <ul className="text-gray-600 mt-1 space-y-0.5">
                <li>• Date</li>
                <li>• Date & Time</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CustomFieldsPage() {
  return (
    <RequireAuth>
      <CustomFieldsPageContent />
    </RequireAuth>
  )
}
