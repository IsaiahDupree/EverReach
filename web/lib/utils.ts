import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Warmth color helpers
export function getWarmthColor(warmth: number | undefined | null): string {
  if (warmth == null) return 'bg-gray-400'
  if (warmth >= 70) return 'bg-teal-500' // Hot
  if (warmth >= 40) return 'bg-yellow-400' // Warm
  if (warmth >= 20) return 'bg-blue-300' // Cool
  return 'bg-red-500' // Cold
}

export function getWarmthLabel(warmth: number | undefined | null): string {
  if (warmth == null) return 'Unknown'
  if (warmth >= 70) return 'Hot'
  if (warmth >= 40) return 'Warm'
  if (warmth >= 20) return 'Cool'
  return 'Cold'
}

// Format date helpers
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}
