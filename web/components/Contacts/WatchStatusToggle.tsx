"use client"

import { Eye, Star, AlertCircle } from 'lucide-react'
import { useUpdateWatchStatus } from '@/lib/hooks/useContacts'
import { useToast } from '@/components/ui'
import { Dropdown, DropdownButton } from '@/components/ui/Dropdown'

interface WatchStatusToggleProps {
  contactId: string
  currentStatus?: 'none' | 'watch' | 'important' | 'vip'
}

export function WatchStatusToggle({ contactId, currentStatus = 'none' }: WatchStatusToggleProps) {
  const updateWatchStatus = useUpdateWatchStatus()
  const { showToast } = useToast()

  const watchOptions = [
    { 
      value: 'none', 
      label: 'None', 
      description: 'No alerts',
      icon: null,
    },
    { 
      value: 'watch', 
      label: 'Watch', 
      description: 'Alert at warmth 25',
      icon: <Eye className="h-4 w-4" />,
    },
    { 
      value: 'important', 
      label: 'Important', 
      description: 'Alert when warmth drops low',
      icon: <AlertCircle className="h-4 w-4" />,
    },
    { 
      value: 'vip', 
      label: 'VIP', 
      description: 'Alert at warmth 40',
      icon: <Star className="h-4 w-4" />,
    },
  ]

  const currentOption = watchOptions.find(opt => opt.value === currentStatus) || watchOptions[0]!

  const handleChange = async (value: string) => {
    try {
      await updateWatchStatus.mutateAsync({
        id: contactId,
        watch_status: value as any,
      })
      showToast('success', `Watch status updated to ${value}`)
    } catch (error) {
      showToast('error', 'Failed to update watch status')
    }
  }

  return (
    <Dropdown
      trigger={
        <DropdownButton>
          {currentOption!.icon && <span className="mr-1">{currentOption!.icon}</span>}
          {currentOption!.label}
        </DropdownButton>
      }
      items={watchOptions.map(option => ({
        label: option.label,
        onClick: () => handleChange(option.value),
        icon: option.icon,
      }))}
    />
  )
}
