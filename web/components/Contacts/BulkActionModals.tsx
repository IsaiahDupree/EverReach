'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { usePipelines } from '@/lib/hooks/usePipelines'

interface BulkTagsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (tags: string[]) => void
  selectedCount: number
  isPending?: boolean
}

export function BulkTagsModal({ isOpen, onClose, onConfirm, selectedCount, isPending }: BulkTagsModalProps) {
  const [tagsInput, setTagsInput] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length > 0) {
      onConfirm(tags)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Tags</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Add tags to {selectedCount} selected {selectedCount === 1 ? 'contact' : 'contacts'}
        </p>

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g., vip, customer, lead"
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isPending} disabled={!tagsInput.trim()}>
            Add Tags
          </Button>
        </div>
      </div>
    </div>
  )
}

interface BulkPipelineModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (pipelineId: string, stageId: string) => void
  selectedCount: number
  isPending?: boolean
}

export function BulkPipelineModal({ isOpen, onClose, onConfirm, selectedCount, isPending }: BulkPipelineModalProps) {
  const [pipelineId, setPipelineId] = useState('')
  const [stageId, setStageId] = useState('')

  const { data: pipelines } = usePipelines()
  const selectedPipeline = pipelines?.find(p => p.id === pipelineId)

  if (!isOpen) return null

  const handleSubmit = () => {
    if (pipelineId && stageId) {
      onConfirm(pipelineId, stageId)
    }
  }

  const pipelineOptions = pipelines?.map(p => ({
    value: p.id,
    label: p.name,
  })) || []

  const stageOptions = selectedPipeline?.stage_order?.map((stageId: string) => {
    const stage = (selectedPipeline as any).stages?.find((s: any) => s.id === stageId)
    return {
      value: stageId,
      label: stage?.name || stageId,
    }
  }) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add to Pipeline</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Add {selectedCount} selected {selectedCount === 1 ? 'contact' : 'contacts'} to pipeline
        </p>

        <div className="space-y-4">
          <Select
            label="Pipeline"
            value={pipelineId}
            onChange={(e) => {
              setPipelineId(e.target.value)
              setStageId('')
            }}
            options={pipelineOptions}
            placeholder="Select pipeline"
          />

          {pipelineId && (
            <Select
              label="Stage"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              options={stageOptions}
              placeholder="Select stage"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            isLoading={isPending} 
            disabled={!pipelineId || !stageId}
          >
            Add to Pipeline
          </Button>
        </div>
      </div>
    </div>
  )
}

interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedCount: number
  isPending?: boolean
}

export function BulkDeleteModal({ isOpen, onClose, onConfirm, selectedCount, isPending }: BulkDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Contacts</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{selectedCount}</strong> selected {selectedCount === 1 ? 'contact' : 'contacts'}? 
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            isLoading={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete {selectedCount} {selectedCount === 1 ? 'Contact' : 'Contacts'}
          </Button>
        </div>
      </div>
    </div>
  )
}
