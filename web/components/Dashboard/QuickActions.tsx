import Link from 'next/link'
import { Users, Mic, MessageSquare, Sparkles } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      label: 'Add Contact',
      href: '/contacts/new',
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'Voice Note',
      href: '/voice-notes',
      icon: Mic,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      label: 'AI Chat',
      href: '/chat',
      icon: MessageSquare,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      label: 'Compose',
      href: '/compose',
      icon: Sparkles,
      color: 'bg-pink-500 hover:bg-pink-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.label}
            href={action.href as any}
            className={`${action.color} text-white rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 shadow-md`}
          >
            <Icon className="h-8 w-8" />
            <span className="font-medium">{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
