"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { useCreateContact, useUpdateContact } from '@/lib/hooks/useContacts'
import { DynamicFieldsEditor } from '@/components/CustomFields/DynamicFieldsEditor'

interface Contact {
  id?: string
  display_name: string
  company?: string
  title?: string
  emails?: string[]
  phones?: string[]
  tags?: string[]
  notes?: string
  location?: string
  timezone?: string
}

interface ContactFormProps {
  contact?: Contact
  mode: 'create' | 'edit'
}

export function ContactForm({ contact, mode }: ContactFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()

  const [formData, setFormData] = useState<Contact>({
    display_name: contact?.display_name || '',
    company: contact?.company || '',
    title: contact?.title || '',
    emails: contact?.emails || [],
    phones: contact?.phones || [],
    tags: contact?.tags || [],
    notes: contact?.notes || '',
    location: contact?.location || '',
    timezone: contact?.timezone || '',
  })

  const [emailInput, setEmailInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Name is required'
    }

    // Validate email formats
    formData.emails?.forEach((email, i) => {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors[`email_${i}`] = 'Invalid email format'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      showToast('error', 'Please fix the errors in the form')
      return
    }

    try {
      if (mode === 'create') {
        await createContact.mutateAsync(formData)
        showToast('success', 'Contact created successfully')
        router.push('/contacts')
      } else {
        if (!contact?.id) return
        await updateContact.mutateAsync({ id: contact.id, ...formData })
        showToast('success', 'Contact updated successfully')
        router.push(`/contacts/${contact.id}`)
      }
    } catch (error) {
      showToast('error', `Failed to ${mode} contact`)
    }
  }

  const addEmail = () => {
    if (emailInput.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setErrors({ ...errors, emailInput: 'Invalid email format' })
      return
    }
    if (emailInput.trim()) {
      setFormData({ ...formData, emails: [...(formData.emails || []), emailInput] })
      setEmailInput('')
      setErrors({ ...errors, emailInput: '' })
    }
  }

  const removeEmail = (index: number) => {
    setFormData({
      ...formData,
      emails: formData.emails?.filter((_, i) => i !== index),
    })
  }

  const addPhone = () => {
    if (phoneInput.trim()) {
      setFormData({ ...formData, phones: [...(formData.phones || []), phoneInput] })
      setPhoneInput('')
    }
  }

  const removePhone = (index: number) => {
    setFormData({
      ...formData,
      phones: formData.phones?.filter((_, i) => i !== index),
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index),
    })
  }

  const isSubmitting = createContact.isPending || updateContact.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className={`w-full rounded-lg border ${
              errors.display_name ? 'border-red-500' : 'border-gray-300'
            } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="John Doe"
          />
          {errors.display_name && (
            <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>
          )}
        </div>

        {/* Company & Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CEO"
            />
          </div>
        </div>

        {/* Location & Timezone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="San Francisco, CA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <input
              type="text"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="America/Los_Angeles"
            />
          </div>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Contact Methods</h2>

        {/* Emails */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Emails</label>
          <div className="space-y-2">
            {formData.emails?.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removeEmail(i)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                className={`flex-1 rounded-lg border ${
                  errors.emailInput ? 'border-red-500' : 'border-gray-300'
                } px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="email@example.com"
              />
              <Button type="button" onClick={addEmail} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.emailInput && (
              <p className="text-red-500 text-sm">{errors.emailInput}</p>
            )}
          </div>
        </div>

        {/* Phones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phones</label>
          <div className="space-y-2">
            {formData.phones?.map((phone, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="tel"
                  value={phone}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => removePhone(i)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
              <Button type="button" onClick={addPhone} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag..."
            />
            <Button type="button" onClick={addTag} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add any notes about this contact..."
        />
      </div>

      {/* Custom Fields */}
      {contact?.id && (
        <div className="rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
          <DynamicFieldsEditor contactId={contact.id} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {mode === 'create' ? 'Create Contact' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
