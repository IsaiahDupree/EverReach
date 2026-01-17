// Admin Types

export interface SystemStats {
  total_users: number
  total_contacts: number
  total_interactions: number
  total_pipelines: number
  total_goals: number
  total_files: number
  storage_used_mb: number
  storage_limit_mb: number
  active_users_today: number
  active_users_week: number
  avg_warmth_score: number
}

export interface OrganizationSettings {
  id: string
  name: string
  logo_url?: string
  timezone: string
  date_format: string
  currency: string
  language: string
  features_enabled: string[]
  max_users: number
  storage_limit_gb: number
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  created_at: string
}

export const AVAILABLE_FEATURES = [
  { id: 'ai_chat', label: 'AI Chat', description: 'Access to AI assistant' },
  { id: 'voice_notes', label: 'Voice Notes', description: 'Voice note transcription' },
  { id: 'custom_fields', label: 'Custom Fields', description: 'Unlimited custom fields' },
  { id: 'automation', label: 'Automation', description: 'Workflow automation' },
  { id: 'pipelines', label: 'Pipelines', description: 'Sales pipeline management' },
  { id: 'analytics', label: 'Analytics', description: 'Advanced analytics' },
  { id: 'integrations', label: 'Integrations', description: 'Third-party integrations' },
  { id: 'bulk_operations', label: 'Bulk Operations', description: 'Bulk contact actions' },
]

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
]
