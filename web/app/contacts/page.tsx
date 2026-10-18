"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Filter as FilterIcon } from 'lucide-react'
import { useContacts } from '@/lib/hooks/useContacts'
import { SearchBar } from '@/components/Contacts/SearchBar'
import { FilterPanel } from '@/components/Contacts/FilterPanel'
import { ContactRow } from '@/components/Contacts/ContactRow'
import { AdvancedFilterBuilder } from '@/components/Filters/AdvancedFilterBuilder'
import { BulkActionBar } from '@/components/Contacts/BulkActionBar'
import { BulkTagsModal, BulkPipelineModal, BulkDeleteModal } from '@/components/Contacts/BulkActionModals'
import { Button, SkeletonTable } from '@/components/ui'
import { FilterGroup, buildFilterQuery } from '@/lib/types/filters'
import { useBulkAddTags, useBulkSetWatch, useBulkAddToPipeline, useBulkDelete, useBulkExport } from '@/lib/hooks/useBulkOperations'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'

function ContactsContent() {
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [warmthFilter, setWarmthFilter] = useState<string | null>(null)
  const [watchFilter, setWatchFilter] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup>({
    logic: 'AND',
    conditions: [],
  })
  const [appliedFilter, setAppliedFilter] = useState<FilterGroup | null>(null)

  // Bulk operations state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [showPipelineModal, setShowPipelineModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Bulk operation hooks
  const bulkAddTags = useBulkAddTags()
  const bulkSetWatch = useBulkSetWatch()
  const bulkAddToPipeline = useBulkAddToPipeline()
  const bulkDelete = useBulkDelete()
  const bulkExport = useBulkExport()

  const { data: contacts, isLoading, error } = useContacts({
    search: searchQuery || undefined,
    warmth: warmthFilter as any,
    watch_status: watchFilter || undefined,
  })

  // Apply client-side filtering if advanced filter is set
  const filteredContacts = appliedFilter && appliedFilter.conditions.length > 0
    ? contacts?.filter(contact => {
        // Simple client-side filtering implementation
        // In production, this should be done server-side
        return true // Placeholder
      })
    : contacts

  // Bulk operation handlers
  const toggleContact = (id: string) => {
    const newSelection = new Set(selectedContacts)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedContacts(newSelection)
  }

  const selectAll = () => {
    if (contacts) {
      setSelectedContacts(new Set(contacts.map(c => c.id)))
    }
  }

  const clearSelection = () => {
    setSelectedContacts(new Set())
  }

  const handleAddTags = async (tags: string[]) => {
    try {
      const result = await bulkAddTags.mutateAsync({
        contactIds: Array.from(selectedContacts),
        tags,
      })
      showToast('success', `Added tags to ${result.success} contacts`)
      setShowTagsModal(false)
      clearSelection()
    } catch (error) {
      showToast('error', 'Failed to add tags')
    }
  }

  const handleSetWatch = async () => {
    try {
      const result = await bulkSetWatch.mutateAsync(Array.from(selectedContacts))
      showToast('success', `Set watch for ${result.success} contacts`)
      clearSelection()
    } catch (error) {
      showToast('error', 'Failed to set watch')
    }
  }

  const handleAddToPipeline = async (pipelineId: string, stageId: string) => {
    try {
      const result = await bulkAddToPipeline.mutateAsync({
        contactIds: Array.from(selectedContacts),
        pipelineId,
        stageId,
      })
      showToast('success', `Added ${result.success} contacts to pipeline`)
      setShowPipelineModal(false)
      clearSelection()
    } catch (error) {
      showToast('error', 'Failed to add to pipeline')
    }
  }

  const handleExport = async () => {
    try {
      await bulkExport.mutateAsync(Array.from(selectedContacts))
      showToast('success', 'Contacts exported successfully')
      clearSelection()
    } catch (error) {
      showToast('error', 'Failed to export contacts')
    }
  }

  const handleDelete = async () => {
    try {
      const result = await bulkDelete.mutateAsync(Array.from(selectedContacts))
      showToast('success', `Deleted ${result.success} contacts`)
      setShowDeleteModal(false)
      clearSelection()
    } catch (error) {
      showToast('error', 'Failed to delete contacts')
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load contacts. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            {contacts ? `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}` : 'Loading...'}
          </p>
        </div>
        <Link href="/contacts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </Link>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name, company, or tags..."
      />

      {/* Quick Filters */}
      <div className="flex items-center justify-between">
        <FilterPanel
          warmthFilter={warmthFilter}
          onWarmthChange={setWarmthFilter}
          watchFilter={watchFilter}
          onWatchChange={setWatchFilter}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <FilterIcon className="h-4 w-4 mr-2" />
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <AdvancedFilterBuilder
          value={advancedFilter}
          onChange={setAdvancedFilter}
          onApply={() => setAppliedFilter(advancedFilter)}
          onClear={() => {
            setAdvancedFilter({ logic: 'AND', conditions: [] })
            setAppliedFilter(null)
          }}
        />
      )}

      {/* Contacts List */}
      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : contacts && contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactRow 
              key={contact.id} 
              contact={contact} 
              isSelected={selectedContacts.has(contact.id)}
              onToggleSelect={toggleContact}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-gray-600 mb-4">
            {searchQuery || warmthFilter || watchFilter
              ? 'No contacts match your filters.'
              : 'No contacts yet. Add your first contact to get started.'}
          </p>
          <Link href="/contacts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </Link>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedContacts.size > 0 && (
        <BulkActionBar
          selectedCount={selectedContacts.size}
          onClearSelection={clearSelection}
          onAddTags={() => setShowTagsModal(true)}
          onSetWatch={handleSetWatch}
          onAddToPipeline={() => setShowPipelineModal(true)}
          onExport={handleExport}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* Bulk Action Modals */}
      <BulkTagsModal
        isOpen={showTagsModal}
        onClose={() => setShowTagsModal(false)}
        onConfirm={handleAddTags}
        selectedCount={selectedContacts.size}
        isPending={bulkAddTags.isPending}
      />

      <BulkPipelineModal
        isOpen={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        onConfirm={handleAddToPipeline}
        selectedCount={selectedContacts.size}
        isPending={bulkAddToPipeline.isPending}
      />

      <BulkDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        selectedCount={selectedContacts.size}
        isPending={bulkDelete.isPending}
      />
    </div>
  )
}

export default function ContactsPage() {
  return (
    <RequireAuth>
      <ContactsContent />
    </RequireAuth>
  )
}
