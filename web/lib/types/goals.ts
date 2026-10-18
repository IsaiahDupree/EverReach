// Goals Types

export type GoalType = 
  | 'interactions' // Number of interactions
  | 'contacts' // Number of new contacts
  | 'warmth' // Warmth score maintenance
  | 'pipeline' // Pipeline deals
  | 'revenue' // Revenue target
  | 'meetings' // Number of meetings
  | 'follow_ups' // Timely follow-ups
  | 'custom' // Custom metric

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export type GoalStatus = 'active' | 'completed' | 'failed' | 'archived'

export interface Goal {
  id: string
  user_id: string
  name: string
  description?: string
  goal_type: GoalType
  target_value: number
  current_value: number
  period: GoalPeriod
  start_date: string
  end_date: string
  status: GoalStatus
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface GoalProgress {
  goal_id: string
  date: string
  value: number
  notes?: string
}

export const GOAL_TYPE_CONFIG: Record<GoalType, {
  label: string
  icon: string
  unit: string
  description: string
}> = {
  interactions: {
    label: 'Interactions',
    icon: '💬',
    unit: 'interactions',
    description: 'Track number of interactions with contacts',
  },
  contacts: {
    label: 'New Contacts',
    icon: '👥',
    unit: 'contacts',
    description: 'Add new contacts to your network',
  },
  warmth: {
    label: 'Warmth Score',
    icon: '🔥',
    unit: 'points',
    description: 'Maintain relationship warmth above target',
  },
  pipeline: {
    label: 'Pipeline Deals',
    icon: '📊',
    unit: 'deals',
    description: 'Close deals in your pipeline',
  },
  revenue: {
    label: 'Revenue',
    icon: '💰',
    unit: 'dollars',
    description: 'Achieve revenue targets',
  },
  meetings: {
    label: 'Meetings',
    icon: '📅',
    unit: 'meetings',
    description: 'Schedule and complete meetings',
  },
  follow_ups: {
    label: 'Follow-ups',
    icon: '⏰',
    unit: 'follow-ups',
    description: 'Complete timely follow-ups',
  },
  custom: {
    label: 'Custom Goal',
    icon: '🎯',
    unit: 'units',
    description: 'Track any custom metric',
  },
}

export const GOAL_PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Date Range' },
]

export function calculateGoalProgress(goal: Goal): {
  percentage: number
  remaining: number
  isOnTrack: boolean
  daysRemaining: number
} {
  const percentage = Math.min((goal.current_value / goal.target_value) * 100, 100)
  const remaining = Math.max(goal.target_value - goal.current_value, 0)
  
  const now = new Date()
  const endDate = new Date(goal.end_date)
  const startDate = new Date(goal.start_date)
  
  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  const expectedProgress = (daysElapsed / totalDays) * 100
  const isOnTrack = percentage >= expectedProgress

  return {
    percentage: Math.round(percentage),
    remaining,
    isOnTrack,
    daysRemaining,
  }
}

export function getGoalStatusColor(status: GoalStatus): string {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'archived':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function formatGoalValue(value: number, type: GoalType): string {
  if (type === 'revenue') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  
  return value.toString()
}
