"use client"

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useUpdateContact } from '@/lib/hooks/useContacts'
import { useToast } from '@/components/ui'
import { Button } from '@/components/ui'

interface TagsEditorProps {
  contactId: string
  tags: string[]
}

export function TagsEditor({ contactId, tags }: TagsEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const updateContact = useUpdateContact()
  const { showToast } = useToast()

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    
    const trimmedTag = newTag.trim()
    if (tags.includes(trimmedTag)) {
      showToast('error', 'Tag already exists')
      return
    }

    try {
      await updateContact.mutateAsync({
        id: contactId,
        tags: [...tags, trimmedTag],
      })
      setNewTag('')
      setIsAdding(false)
      showToast('success', 'Tag added')
    } catch (error) {
      showToast('error', 'Failed to add tag')
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      await updateContact.mutateAsync({
        id: contactId,
        tags: tags.filter(t => t !== tagToRemove),
      })
      showToast('success', 'Tag removed')
    } catch (error) {
      showToast('error', 'Failed to remove tag')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-700">Tags</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-blue-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleAddTag()
                if (e.key === 'Escape') {
                  setIsAdding(false)
                  setNewTag('')
                }
              }}
              placeholder="New tag..."
              className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddTag}
              isLoading={updateContact.isPending}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false)
                setNewTag('')
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {tags.length === 0 && !isAdding && (
          <p className="text-sm text-gray-500">No tags yet</p>
        )}
      </div>
    </div>
  )
}
