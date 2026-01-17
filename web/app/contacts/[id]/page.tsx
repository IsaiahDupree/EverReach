"use client"

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, RefreshCw, Sparkles, Mail, Phone, Building2, MapPin, Clock } from 'lucide-react'
import { useContact, useDeleteContact, useRecomputeWarmth } from '@/lib/hooks/useContacts'
import { useInteractions } from '@/lib/hooks/useInteractions'
import { WatchStatusToggle } from '@/components/Contacts/WatchStatusToggle'
import { TagsEditor } from '@/components/Contacts/TagsEditor'
import { InteractionsList } from '@/components/Interactions/InteractionsList'
import { WarmthScore } from '@/components/Warmth/WarmthScore'
import { WarmthInsights } from '@/components/Warmth/WarmthInsights'
import { ContactAnalysisPanel } from '@/components/Agent/ContactAnalysisPanel'
import { ContextPreview } from '@/components/Agent/ContextPreview'
import { CustomFieldsDisplay } from '@/components/CustomFields/CustomFieldsDisplay'
import { Button, LoadingScreen, useToast } from '@/components/ui'
import { getWarmthColor, getWarmthLabel, formatDateTime } from '@/lib/utils'
import RequireAuth from '@/components/RequireAuth'
import { useRouter } from 'next/navigation'

function ContactDetailContent() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const { data: contact, isLoading, error } = useContact(id || null)
  const deleteContact = useDeleteContact()
  const recomputeWarmth = useRecomputeWarmth()
  const { showToast } = useToast()

  if (!id) {
    return <div className="text-red-600">Contact ID is missing</div>
  }

  if (isLoading) {
    return <LoadingScreen message="Loading contact..." />
  }

  if (error || !contact) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load contact. Please try again.</p>
        <Link href="/contacts" className="mt-4 inline-block">
          <Button variant="secondary">Back to Contacts</Button>
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${contact.display_name}?`)) return
    
    try {
      await deleteContact.mutateAsync(contact.id)
      showToast('success', 'Contact deleted')
      router.push('/contacts')
    } catch (error) {
      showToast('error', 'Failed to delete contact')
    }
  }

  const handleRecomputeWarmth = async () => {
    try {
      await recomputeWarmth.mutateAsync(contact.id)
      showToast('success', 'Warmth recomputed')
    } catch (error) {
      showToast('error', 'Failed to recompute warmth')
    }
  }

  const warmthColor = getWarmthColor(contact.warmth)
  const warmthLabel = getWarmthLabel(contact.warmth)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contact.display_name}</h1>
            {contact.title && contact.company && (
              <p className="text-gray-600 mt-1">
                {contact.title} at {contact.company}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleDelete}
            isLoading={deleteContact.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Warmth Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warmth Score */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 flex flex-col items-center">
          <WarmthScore warmth={contact.warmth} size="lg" />
          <div className="mt-4 w-full">
            <div className="text-sm text-gray-600 mb-2 text-center">Watch Status</div>
            <WatchStatusToggle contactId={contact.id} currentStatus={contact.watch_status} />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecomputeWarmth}
            isLoading={recomputeWarmth.isPending}
            className="mt-4 w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recompute Warmth
          </Button>
        </div>

        {/* Warmth Insights */}
        <div className="lg:col-span-2">
          <WarmthInsights
            warmth={contact.warmth}
            lastInteraction={contact.last_interaction}
            interactionCount={0}
            trend="stable"
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contact.emails && contact.emails.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4" />
                Email
              </div>
              {contact.emails.map((email: string, i: number) => (
                <a
                  key={i}
                  href={`mailto:${email}`}
                  className="block text-blue-600 hover:underline"
                >
                  {email}
                </a>
              ))}
            </div>
          )}

          {contact.phones && contact.phones.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4" />
                Phone
              </div>
              {contact.phones.map((phone: string, i: number) => (
                <a
                  key={i}
                  href={`tel:${phone}`}
                  className="block text-blue-600 hover:underline"
                >
                  {phone}
                </a>
              ))}
            </div>
          )}

          {contact.company && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4" />
                Company
              </div>
              <p className="text-gray-900">{contact.company}</p>
            </div>
          )}

          {contact.location && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <p className="text-gray-900">{contact.location}</p>
            </div>
          )}
        </div>

        {contact.notes && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
            <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Custom Fields */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-3">Custom Fields</div>
          <CustomFieldsDisplay contactId={contact.id} />
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-lg border border-gray-200 p-6">
        <TagsEditor contactId={contact.id} tags={contact.tags || []} />
      </div>

      {/* AI Relationship Analysis */}
      <ContactAnalysisPanel contactId={contact.id} />

      {/* AI Context Preview */}
      <ContextPreview contactId={contact.id} interactions={20} />

      {/* AI Quick Actions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => router.push(`/compose?contact=${contact.id}` as any)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Compose Message
          </Button>
        </div>
      </div>

      {/* Interaction Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <InteractionsList contactId={contact.id} />
      </div>

      {/* Metadata */}
      {(contact.created_at || contact.updated_at) && (
        <div className="flex items-center gap-6 text-sm text-gray-500">
          {contact.created_at && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Created: {formatDateTime(contact.created_at)}
            </div>
          )}
          {contact.updated_at && (
            <div>
              Updated: {formatDateTime(contact.updated_at)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContactDetailPage() {
  return (
    <RequireAuth>
      <ContactDetailContent />
    </RequireAuth>
  )
}
