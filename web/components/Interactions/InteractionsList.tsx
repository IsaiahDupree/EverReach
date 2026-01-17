'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useInteractions } from '@/lib/hooks/useInteractions'
import { InteractionTimeline } from './InteractionTimeline'
import { CreateInteractionModal } from './CreateInteractionModal'
import { Button } from '@/components/ui'

interface InteractionsListProps {
  contactId: string
  limit?: number
}

export function InteractionsList({ contactId, limit = 50 }: InteractionsListProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: interactions, isLoading } = useInteractions({
    contact_id: contactId,
    limit,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Interaction History</h2>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Interaction
        </Button>
      </div>

      {/* Timeline */}
      <InteractionTimeline
        interactions={interactions || []}
        isLoading={isLoading}
      />

      {/* Create Modal */}
      <CreateInteractionModal
        contactId={contactId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          // Timeline will automatically refresh via React Query
        }}
      />
    </div>
  )
}
