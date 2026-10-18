"use client"

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ContactForm } from '@/components/Contacts/ContactForm'
import { Button } from '@/components/ui'
import RequireAuth from '@/components/RequireAuth'

function NewContactContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Contact</h1>
          <p className="text-gray-600 mt-1">Create a new contact in your network</p>
        </div>
      </div>

      {/* Form */}
      <ContactForm mode="create" />
    </div>
  )
}

export default function NewContactPage() {
  return (
    <RequireAuth>
      <NewContactContent />
    </RequireAuth>
  )
}
