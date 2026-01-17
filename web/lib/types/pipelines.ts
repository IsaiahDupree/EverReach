// Pipeline and Stage Types

export interface Pipeline {
  id: string
  user_id: string
  name: string
  description?: string
  color?: string
  is_default: boolean
  is_archived: boolean
  stage_order: string[] // Array of stage IDs in order
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  description?: string
  color?: string
  display_order: number
  is_closed_stage: boolean // Indicates won/lost stage
  stage_type?: 'active' | 'won' | 'lost' | 'archived'
  created_at: string
  updated_at: string
}

export interface ContactInPipeline {
  id: string
  contact_id: string
  pipeline_id: string
  stage_id: string
  entered_stage_at: string
  expected_value?: number
  probability?: number
  notes?: string
  created_at: string
  updated_at: string
  // Populated fields
  contact?: {
    id: string
    display_name: string
    emails?: string[]
    phones?: string[]
    company?: string
    warmth_score?: number
    warmth_band?: string
    tags?: string[]
  }
}

export interface PipelineMetrics {
  pipeline_id: string
  total_contacts: number
  total_value: number
  weighted_value: number
  conversion_rate: number
  avg_days_in_pipeline: number
  stages: {
    stage_id: string
    stage_name: string
    contact_count: number
    total_value: number
    avg_days_in_stage: number
  }[]
}

export const PIPELINE_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
]

export const STAGE_COLORS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800 border-red-300' },
]

export function getStageColorClass(color?: string): string {
  const colorConfig = STAGE_COLORS.find(c => c.value === color)
  return colorConfig?.class || STAGE_COLORS[0]?.class || 'bg-gray-500'
}

export function getPipelineColorClass(color?: string): string {
  const colorConfig = PIPELINE_COLORS.find(c => c.value === color)
  return colorConfig?.class || PIPELINE_COLORS[0]?.class || 'bg-blue-500'
}

export function formatCurrency(value?: number): string {
  if (!value) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
