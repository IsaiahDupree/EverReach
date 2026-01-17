"use client"

import Link from 'next/link'
import { useContacts } from '@/lib/hooks/useContacts'
import { Skeleton } from '@/components/ui'

export function RelationshipHealthGrid() {
  const { data: contacts, isLoading } = useContacts()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-6">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    )
  }

  // Calculate counts by warmth level
  const hotContacts = contacts?.filter((c) => (c.warmth ?? 0) >= 70) || []
  const warmContacts = contacts?.filter((c) => (c.warmth ?? 0) >= 40 && (c.warmth ?? 0) < 70) || []
  const coolContacts = contacts?.filter((c) => (c.warmth ?? 0) >= 20 && (c.warmth ?? 0) < 40) || []
  const coldContacts = contacts?.filter((c) => (c.warmth ?? 0) < 20) || []

  const healthCategories = [
    {
      label: 'Hot',
      count: hotContacts.length,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      filter: 'hot',
    },
    {
      label: 'Warm',
      count: warmContacts.length,
      color: 'bg-yellow-400',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      filter: 'warm',
    },
    {
      label: 'Cool',
      count: coolContacts.length,
      color: 'bg-blue-300',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      filter: 'cool',
    },
    {
      label: 'Cold',
      count: coldContacts.length,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      filter: 'cold',
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Relationship Health</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {healthCategories.map((category) => (
          <Link
            key={category.label}
            href={`/contacts?warmth=${category.filter}`}
            className={`rounded-lg border ${category.borderColor} ${category.bgColor} p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${category.color}`} />
              <span className="text-sm font-medium text-gray-700">{category.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{category.count}</p>
            <p className="text-xs text-gray-500 mt-1">
              {category.count === 1 ? 'contact' : 'contacts'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
