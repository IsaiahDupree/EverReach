// Message Template Types

export type TemplateCategory = 
  | 'greeting'
  | 'follow_up'
  | 'check_in'
  | 'thank_you'
  | 'introduction'
  | 'meeting_request'
  | 'proposal'
  | 'reminder'
  | 'update'
  | 'other'

export type TemplateChannel = 'email' | 'sms' | 'dm' | 'any'

export interface MessageTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  category: TemplateCategory
  channel: TemplateChannel
  subject?: string // For email templates
  body: string
  variables?: string[] // e.g., ['first_name', 'company', 'last_interaction_date']
  is_active: boolean
  use_count: number
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  label: string
  example: string
  description?: string
}

// Built-in variables available for all templates
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    key: 'contact_name',
    label: 'Contact Name',
    example: 'John Doe',
    description: 'Full name of the contact',
  },
  {
    key: 'first_name',
    label: 'First Name',
    example: 'John',
    description: 'Contact\'s first name',
  },
  {
    key: 'last_name',
    label: 'Last Name',
    example: 'Doe',
    description: 'Contact\'s last name',
  },
  {
    key: 'company',
    label: 'Company',
    example: 'Acme Corp',
    description: 'Contact\'s company name',
  },
  {
    key: 'title',
    label: 'Title',
    example: 'CEO',
    description: 'Contact\'s job title',
  },
  {
    key: 'email',
    label: 'Email',
    example: 'john@example.com',
    description: 'Contact\'s email address',
  },
  {
    key: 'phone',
    label: 'Phone',
    example: '+1 555-0100',
    description: 'Contact\'s phone number',
  },
  {
    key: 'last_interaction_date',
    label: 'Last Interaction Date',
    example: 'March 15, 2024',
    description: 'Date of last interaction',
  },
  {
    key: 'days_since_contact',
    label: 'Days Since Contact',
    example: '5',
    description: 'Number of days since last contact',
  },
  {
    key: 'warmth_score',
    label: 'Warmth Score',
    example: '75',
    description: 'Contact\'s warmth score',
  },
  {
    key: 'my_name',
    label: 'Your Name',
    example: 'Jane Smith',
    description: 'Your full name',
  },
  {
    key: 'my_company',
    label: 'Your Company',
    example: 'My Company Inc',
    description: 'Your company name',
  },
  {
    key: 'my_title',
    label: 'Your Title',
    example: 'Sales Manager',
    description: 'Your job title',
  },
  {
    key: 'current_date',
    label: 'Current Date',
    example: 'October 16, 2025',
    description: 'Today\'s date',
  },
]

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string }> = {
  greeting: { label: 'Greeting', icon: '👋' },
  follow_up: { label: 'Follow Up', icon: '📧' },
  check_in: { label: 'Check In', icon: '💬' },
  thank_you: { label: 'Thank You', icon: '🙏' },
  introduction: { label: 'Introduction', icon: '👤' },
  meeting_request: { label: 'Meeting Request', icon: '📅' },
  proposal: { label: 'Proposal', icon: '📄' },
  reminder: { label: 'Reminder', icon: '⏰' },
  update: { label: 'Update', icon: '📰' },
  other: { label: 'Other', icon: '📝' },
}

// Helper function to extract variables from template body
export function extractVariables(template: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g
  const matches = template.matchAll(variableRegex)
  const variables = new Set<string>()
  
  for (const match of matches) {
    if (match[1]) variables.add(match[1])
  }
  
  return Array.from(variables)
}

// Helper function to replace variables in template
export function replaceVariables(
  template: string,
  values: Record<string, string>
): string {
  let result = template
  
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value || `{{${key}}}`)
  }
  
  return result
}
