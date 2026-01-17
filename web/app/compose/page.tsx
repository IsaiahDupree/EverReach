'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles, Send, Copy, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button, Select, Textarea, Input, LoadingScreen } from '@/components/ui'
import { useContact, useContacts } from '@/lib/hooks/useContacts'
import { useCreateInteraction } from '@/lib/hooks/useInteractions'
import { useContextBundle } from '@/lib/hooks/useContextBundle'
import { ContextPreview } from '@/components/Agent/ContextPreview'
import { TemplateSelector } from '@/components/Templates/TemplateSelector'
import RequireAuth from '@/components/RequireAuth'
import { useToast } from '@/components/ui/Toast'
import { apiFetch } from '@/lib/api'

const messageTemplates = [
  { value: 'catch_up', label: 'Catch Up' },
  { value: 're_engage', label: 'Re-engage' },
  { value: 'check_in', label: 'Check In' },
  { value: 'congratulate', label: 'Congratulate' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'custom', label: 'Custom' },
]

const channels = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'dm', label: 'Direct Message' },
]

const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
]

function MessageComposerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactIdParam = searchParams?.get('contact')
  const { showToast } = useToast()
  
  const { data: contact, isLoading: loadingContact } = useContact(contactIdParam)
  const { data: allContacts } = useContacts()
  const { mutate: createInteraction, isPending: savingInteraction } = useCreateInteraction()

  const [formData, setFormData] = useState({
    contactId: contactIdParam || '',
    template: 'catch_up',
    channel: 'email',
    tone: 'friendly',
    customPrompt: '',
  })

  // Load context bundle for the selected contact
  const { data: contextBundle } = useContextBundle(formData.contactId, { interactions: 10 })
  
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  useEffect(() => {
    if (contactIdParam && contactIdParam !== formData.contactId) {
      setFormData(prev => ({ ...prev, contactId: contactIdParam }))
    }
  }, [contactIdParam, formData.contactId])

  const handleGenerate = async () => {
    if (!formData.contactId) {
      showToast('error', 'Please select a contact')
      return
    }

    setIsGenerating(true)
    
    try {
      // Call real AI endpoint
      const response = await apiFetch('/api/v1/agent/compose/smart', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contactId: formData.contactId,
          goal: formData.template,
          channel: formData.channel,
          tone: formData.tone,
          customPrompt: formData.template === 'custom' ? formData.customPrompt : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      setGeneratedMessage(data.message || data.content || 'Generated message not found')
      
      if (data.alternatives && data.alternatives.length > 0) {
        // Could store alternatives for future use
        console.log('Alternative messages available:', data.alternatives)
      }
    } catch (error) {
      console.error('Failed to generate message:', error)
      showToast('error', `Failed to generate message: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Fallback to simple template
      const selectedContact = allContacts?.find((c: any) => c.id === formData.contactId)
      const name = selectedContact?.display_name || 'there'
      setGeneratedMessage(`Hi ${name},\n\nI wanted to reach out and connect with you.\n\nBest regards,`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage)
    showToast('success', 'Message copied to clipboard')
  }

  const handleSaveAsInteraction = () => {
    if (!formData.contactId || !generatedMessage) return

    createInteraction(
      {
        contact_id: formData.contactId,
        type: 'note',
        direction: 'outbound',
        occurred_at: new Date().toISOString(),
        summary: generatedMessage,
      },
      {
        onSuccess: () => {
          showToast('success', 'Saved as interaction')
          router.push(`/contacts/${formData.contactId}`)
        },
        onError: () => {
          showToast('error', 'Failed to save interaction')
        },
      }
    )
  }

  const handleTemplateSelect = (template: any, filledBody: string, filledSubject?: string) => {
    // Set the generated message directly from template
    setGeneratedMessage(filledBody)
    setShowTemplateSelector(false)
    showToast('success', `Template "${template.name}" applied`)
  }

  if (loadingContact && contactIdParam) {
    return <LoadingScreen message="Loading contact..." />
  }

  const contactOptions = allContacts?.map((c: any) => ({
    value: c.id,
    label: c.display_name,
  })) || []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={contactIdParam ? `/contacts/${contactIdParam}` : '/contacts'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Message Composer</h1>
          <p className="text-gray-600 mt-1">
            Generate personalized messages powered by AI
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Message Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Contact"
            required
            value={formData.contactId}
            onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
            options={contactOptions}
            placeholder="Select a contact"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Template</label>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={!formData.contactId}
              >
                Browse Templates →
              </button>
            </div>
            <Select
              value={formData.template}
              onChange={(e) => setFormData({ ...formData, template: e.target.value })}
              options={messageTemplates}
            />
          </div>

          <Select
            label="Channel"
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
            options={channels}
          />

          <Select
            label="Tone"
            value={formData.tone}
            onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
            options={tones}
          />
        </div>

        {formData.template === 'custom' && (
          <Textarea
            label="Custom Instructions"
            placeholder="Describe the message you want to generate..."
            rows={3}
            value={formData.customPrompt}
            onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
          />
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={isGenerating || !formData.contactId}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Message'}
          </Button>
        </div>
      </div>

      {/* Context Preview */}
      {formData.contactId && (
        <ContextPreview contactId={formData.contactId} interactions={10} />
      )}

      {/* Generated Message */}
      {generatedMessage && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Generated Message</h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>

          <Textarea
            value={generatedMessage}
            onChange={(e) => setGeneratedMessage(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleSaveAsInteraction}
              isLoading={savingInteraction}
              disabled={savingInteraction}
            >
              Save as Interaction
            </Button>
            <Button disabled>
              <Send className="h-4 w-4 mr-2" />
              Send Message (Coming Soon)
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!generatedMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Select a contact and choose a message template</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>Customize the tone and channel for your message</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Click "Generate Message" to create a personalized draft</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>Edit the generated message and save it or send directly</span>
            </li>
          </ul>
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <TemplateSelector
            onSelect={handleTemplateSelect}
            channel={formData.channel as any}
            contactData={{
              contact_name: contact?.display_name || '',
              first_name: contact?.display_name?.split(' ')[0] || '',
              last_name: contact?.display_name?.split(' ')[1] || '',
              company: contact?.company || '',
              email: contact?.emails?.[0] || '',
              phone: contact?.phones?.[0] || '',
            }}
            onClose={() => setShowTemplateSelector(false)}
          />
        </div>
      )}
    </div>
  )
}

export default function MessageComposerPage() {
  return (
    <RequireAuth>
      <MessageComposerContent />
    </RequireAuth>
  )
}
