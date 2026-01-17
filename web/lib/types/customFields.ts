// Custom Fields Type Definitions
// Based on backend: 14 field types supported

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'rating'

export type PiiLevel = 'none' | 'light' | 'sensitive'

export interface FieldValidation {
  required?: boolean
  unique?: boolean
  pattern?: string
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  options?: string[] // For select/multiselect
}

export interface CustomFieldDefinition {
  id: string
  entity: 'contact' | 'interaction' // Currently only contact supported
  key: string // Field identifier (snake_case)
  label: string // Display name
  description?: string
  field_type: FieldType
  validation?: FieldValidation
  default_value?: any
  is_indexed?: boolean // Create expression index for filtering
  ai_can_read?: boolean
  ai_can_write?: boolean
  pii_level?: PiiLevel
  synonyms?: string[] // For AI natural language resolution
  display_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface CustomFieldValue {
  [key: string]: any // Dynamic field values
}

export interface FieldChange {
  id: string
  field_key: string
  old_value: any
  new_value: any
  changed_at: string
  changed_by: string
  source: 'ui' | 'api' | 'ai_agent'
}

// UI-specific types
export interface FieldGroup {
  title: string
  fields: CustomFieldDefinition[]
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Yes/No',
  date: 'Date',
  datetime: 'Date & Time',
  select: 'Dropdown',
  multiselect: 'Multiple Choice',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  currency: 'Currency',
  rating: 'Rating',
}

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: '📝',
  textarea: '📄',
  number: '🔢',
  integer: '#️⃣',
  boolean: '✓',
  date: '📅',
  datetime: '🕒',
  select: '▼',
  multiselect: '☑️',
  email: '📧',
  phone: '📞',
  url: '🔗',
  currency: '💰',
  rating: '⭐',
}

export const PII_LEVEL_LABELS: Record<PiiLevel, string> = {
  none: 'None',
  light: 'Light (Name, Company)',
  sensitive: 'Sensitive (SSN, Health)',
}
