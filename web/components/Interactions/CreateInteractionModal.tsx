'use client'

import { useState } from 'react'
import { Dialog, Button, Input, Select, Textarea } from '@/components/ui'
import { useCreateInteraction } from '@/lib/hooks/useInteractions'

interface CreateInteractionModalProps {
  contactId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const interactionTypes = [
  { value: 'call', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'message', label: 'Message' },
  { value: 'note', label: 'Note' },
]

const directionOptions = [
  { value: 'inbound', label: 'Incoming' },
  { value: 'outbound', label: 'Outgoing' },
  { value: 'internal', label: 'Internal' },
]

const sentimentOptions = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

export function CreateInteractionModal({ 
  contactId, 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateInteractionModalProps) {
  const [formData, setFormData] = useState({
    type: 'note' as 'call' | 'meeting' | 'message' | 'note',
    direction: 'outbound' as 'inbound' | 'outbound' | 'internal' | undefined,
    occurred_at: new Date().toISOString().slice(0, 16),
    summary: '',
    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative' | undefined,
    action_items: '',
  })

  const { mutate: createInteraction, isPending } = useCreateInteraction()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const actionItemsArray = formData.action_items
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0)

    createInteraction(
      {
        contact_id: contactId,
        type: formData.type,
        direction: formData.direction,
        occurred_at: new Date(formData.occurred_at).toISOString(),
        summary: formData.summary || undefined,
        sentiment: formData.sentiment,
        action_items: actionItemsArray.length > 0 ? actionItemsArray : undefined,
      },
      {
        onSuccess: () => {
          setFormData({
            type: 'note',
            direction: 'outbound',
            occurred_at: new Date().toISOString().slice(0, 16),
            summary: '',
            sentiment: 'neutral',
            action_items: '',
          })
          onSuccess?.()
          onClose()
        },
      }
    )
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Log Interaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            options={interactionTypes}
          />

          <Select
            label="Direction"
            value={formData.direction || ''}
            onChange={(e) => setFormData({ ...formData, direction: e.target.value as any || undefined })}
            options={directionOptions}
            placeholder="Select direction"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Date & Time"
            required
            value={formData.occurred_at}
            onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
          />

          <Select
            label="Sentiment"
            value={formData.sentiment || ''}
            onChange={(e) => setFormData({ ...formData, sentiment: e.target.value as any || undefined })}
            options={sentimentOptions}
            placeholder="Select sentiment"
          />
        </div>

        <Textarea
          label="Summary"
          placeholder="What happened during this interaction?"
          rows={4}
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
        />

        <Textarea
          label="Action Items"
          placeholder="Enter one action item per line"
          helperText="One item per line"
          rows={3}
          value={formData.action_items}
          onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Interaction'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
