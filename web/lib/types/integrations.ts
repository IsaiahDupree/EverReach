// Integrations Types

export type IntegrationType = 
  | 'google_workspace'
  | 'microsoft_365'
  | 'slack'
  | 'zapier'
  | 'webhooks'
  | 'calendar'
  | 'email'
  | 'crm'

export interface Integration {
  id: string
  user_id: string
  type: IntegrationType
  name: string
  is_active: boolean
  config: Record<string, any>
  last_synced_at?: string
  created_at: string
}

export const AVAILABLE_INTEGRATIONS: Record<IntegrationType, {
  name: string
  description: string
  icon: string
  category: string
  features: string[]
  comingSoon?: boolean
}> = {
  google_workspace: {
    name: 'Google Workspace',
    description: 'Sync Gmail, Calendar, and Contacts',
    icon: '🔵',
    category: 'Productivity',
    features: [
      'Sync email conversations',
      'Import contacts from Google',
      'Calendar integration',
      'Auto-log interactions',
    ],
  },
  microsoft_365: {
    name: 'Microsoft 365',
    description: 'Connect Outlook, Teams, and OneDrive',
    icon: '🔷',
    category: 'Productivity',
    features: [
      'Outlook email sync',
      'Teams integration',
      'Calendar sync',
      'Contact import',
    ],
  },
  slack: {
    name: 'Slack',
    description: 'Get notifications and updates in Slack',
    icon: '💬',
    category: 'Communication',
    features: [
      'Warmth alerts',
      'New contact notifications',
      'Daily summaries',
      'Quick actions',
    ],
  },
  zapier: {
    name: 'Zapier',
    description: 'Connect with 5,000+ apps',
    icon: '⚡',
    category: 'Automation',
    features: [
      'Trigger workflows',
      'Automate tasks',
      'Connect any app',
      'Custom integrations',
    ],
  },
  webhooks: {
    name: 'Webhooks',
    description: 'Custom HTTP callbacks for events',
    icon: '🔗',
    category: 'Developer',
    features: [
      'Real-time events',
      'Custom endpoints',
      'HMAC signatures',
      'Retry logic',
    ],
  },
  calendar: {
    name: 'Calendar',
    description: 'Sync with your favorite calendar app',
    icon: '📅',
    category: 'Productivity',
    features: [
      'Two-way sync',
      'Meeting reminders',
      'Auto-log meetings',
      'Time tracking',
    ],
    comingSoon: true,
  },
  email: {
    name: 'Email Provider',
    description: 'Connect any email service',
    icon: '📧',
    category: 'Communication',
    features: [
      'Email sync',
      'Thread tracking',
      'Auto-categorize',
      'Smart parsing',
    ],
    comingSoon: true,
  },
  crm: {
    name: 'Other CRMs',
    description: 'Import from Salesforce, HubSpot, etc.',
    icon: '📊',
    category: 'CRM',
    features: [
      'One-way sync',
      'Contact import',
      'Activity history',
      'Custom mapping',
    ],
    comingSoon: true,
  },
}
