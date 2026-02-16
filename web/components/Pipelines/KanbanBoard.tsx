'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Mail, Phone, Building2, DollarSign } from 'lucide-react'
import { usePipelineContacts, useMoveContactToStage } from '@/lib/hooks/usePipelines'
import { PipelineStage, ContactInPipeline, getStageColorClass, formatCurrency } from '@/lib/types/pipelines'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface KanbanBoardProps {
  pipelineId: string
  stages: PipelineStage[]
  onAddContact?: (stageId: string) => void
}

export function KanbanBoard({ pipelineId, stages, onAddContact }: KanbanBoardProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { data: contacts, isLoading } = usePipelineContacts(pipelineId)
  const moveContact = useMoveContactToStage()

  const [draggedContact, setDraggedContact] = useState<string | null>(null)

  // Group contacts by stage
  const contactsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = contacts?.filter(c => c.stage_id === stage.id) || []
    return acc
  }, {} as Record<string, ContactInPipeline[]>)

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedContact(contactId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    
    if (!draggedContact) return

    const contact = contacts?.find(c => c.id === draggedContact)
    if (!contact || contact.stage_id === stageId) {
      setDraggedContact(null)
      return
    }

    try {
      await moveContact.mutateAsync({
        contactId: draggedContact,
        stageId,
      })
      showToast('success', 'Contact moved')
    } catch (error) {
      showToast('error', 'Failed to move contact')
    }

    setDraggedContact(null)
  }

  const handleDragEnd = () => {
    setDraggedContact(null)
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageContacts = contactsByStage[stage.id] || []
        const stageValue = stageContacts.reduce((sum, c) => sum + (c.expected_value || 0), 0)

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage Header */}
            <div className={cn(
              'rounded-t-lg border-2 p-3',
              getStageColorClass(stage.color)
            )}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold">{stage.name}</h3>
                <button
                  className="p-1 hover:bg-black/10 rounded"
                  onClick={() => {/* Stage menu */}}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{stageContacts.length} contacts</span>
                <span className="font-medium">{formatCurrency(stageValue)}</span>
              </div>
            </div>

            {/* Cards Container */}
            <div className="bg-gray-50 border-2 border-t-0 rounded-b-lg min-h-[400px] max-h-[600px] overflow-y-auto p-2 space-y-2">
              {stageContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Drop contacts here
                </div>
              ) : (
                stageContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedContact === contact.id}
                    onClick={() => router.push(`/contacts/${contact.contact_id}` as any)}
                  />
                ))
              )}

              {/* Add Contact Button */}
              {onAddContact && (
                <button
                  onClick={() => onAddContact(stage.id)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-white transition-colors text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add Contact</span>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContactCard({
  contact,
  onDragStart,
  onDragEnd,
  isDragging,
  onClick,
}: {
  contact: ContactInPipeline
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  isDragging: boolean
  onClick: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-3 cursor-move hover:shadow-md transition-shadow',
        isDragging && 'opacity-50'
      )}
    >
      {/* Contact Name */}
      <h4 className="font-medium text-gray-900 mb-2">
        {contact.contact?.display_name || 'Unknown'}
      </h4>

      {/* Company */}
      {contact.contact?.company && (
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{contact.contact.company}</span>
        </div>
      )}

      {/* Contact Methods */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
        {contact.contact?.emails && contact.contact.emails.length > 0 && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span>{contact.contact.emails.length}</span>
          </div>
        )}
        {contact.contact?.phones && contact.contact.phones.length > 0 && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{contact.contact.phones.length}</span>
          </div>
        )}
      </div>

      {/* Expected Value */}
      {contact.expected_value && (
        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
          <DollarSign className="h-3 w-3" />
          <span>{formatCurrency(contact.expected_value)}</span>
          {contact.probability && (
            <span className="text-xs text-gray-500">({contact.probability}%)</span>
          )}
        </div>
      )}

      {/* Tags */}
      {contact.contact?.tags && contact.contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {contact.contact.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {contact.contact.tags.length > 2 && (
            <span className="text-xs text-gray-500">
              +{contact.contact.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Warmth Badge */}
      {contact.contact?.warmth_band && (
        <div className="mt-2">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded font-medium capitalize',
            contact.contact.warmth_band === 'hot' && 'bg-teal-100 text-teal-700',
            contact.contact.warmth_band === 'warm' && 'bg-yellow-100 text-yellow-700',
            contact.contact.warmth_band === 'neutral' && 'bg-orange-100 text-orange-700',
            contact.contact.warmth_band === 'cool' && 'bg-blue-100 text-blue-700',
            contact.contact.warmth_band === 'cold' && 'bg-red-100 text-red-700'
          )}>
            {contact.contact.warmth_band}
          </span>
        </div>
      )}
    </div>
  )
}
