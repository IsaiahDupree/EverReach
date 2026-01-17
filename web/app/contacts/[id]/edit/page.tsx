"use client"

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useContact } from '@/lib/hooks/useContacts'
import { ContactForm } from '@/components/Contacts/ContactForm'
import { Button, LoadingScreen } from '@/components/ui'
import RequireAuth from '@/components/RequireAuth'

function EditContactContent() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { data: contact, isLoading, error } = useContact(id || null)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/contacts/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Contact</h1>
          <p className="text-gray-600 mt-1">{contact.display_name}</p>
        </div>
      </div>

      {/* Form */}
      <ContactForm mode="edit" contact={contact} />
    </div>
  )
}

export default function EditContactPage() {
  return (
    <RequireAuth>
      <EditContactContent />
    </RequireAuth>
  )
}
