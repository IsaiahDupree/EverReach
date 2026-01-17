// Advanced Filters Types

export type FilterField = 
  | 'warmth_score'
  | 'warmth_band'
  | 'last_touch_days_ago'
  | 'tags'
  | 'company'
  | 'title'
  | 'email'
  | 'phone'
  | 'pipeline_stage'
  | 'custom_field'

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'

export interface FilterCondition {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string | number | string[]
  custom_field_key?: string // For custom_field type
}

export interface FilterGroup {
  logic: 'AND' | 'OR'
  conditions: FilterCondition[]
}

export interface SavedFilter {
  id: string
  user_id: string
  name: string
  description?: string
  filter_group: FilterGroup
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export const FILTER_FIELDS: Record<FilterField, {
  label: string
  type: 'number' | 'text' | 'select' | 'multiselect' | 'custom'
  operators: FilterOperator[]
  options?: { value: string; label: string }[]
}> = {
  warmth_score: {
    label: 'Warmth Score',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'],
  },
  warmth_band: {
    label: 'Warmth Band',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: [
      { value: 'hot', label: 'Hot' },
      { value: 'warm', label: 'Warm' },
      { value: 'cooling', label: 'Cooling' },
      { value: 'cold', label: 'Cold' },
    ],
  },
  last_touch_days_ago: {
    label: 'Days Since Last Touch',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'],
  },
  tags: {
    label: 'Tags',
    type: 'multiselect',
    operators: ['in', 'not_in', 'is_empty', 'is_not_empty'],
  },
  company: {
    label: 'Company',
    type: 'text',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  },
  title: {
    label: 'Title',
    type: 'text',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  },
  email: {
    label: 'Email',
    type: 'text',
    operators: ['contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  },
  phone: {
    label: 'Phone',
    type: 'text',
    operators: ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
  },
  pipeline_stage: {
    label: 'Pipeline Stage',
    type: 'select',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
  },
  custom_field: {
    label: 'Custom Field',
    type: 'custom',
    operators: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
  },
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  greater_than: 'is greater than',
  less_than: 'is less than',
  greater_than_or_equal: 'is greater than or equal to',
  less_than_or_equal: 'is less than or equal to',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  in: 'is one of',
  not_in: 'is not one of',
}

/**
 * Build query params from filter group
 */
export function buildFilterQuery(filterGroup: FilterGroup): string {
  const params = new URLSearchParams()
  
  params.set('logic', filterGroup.logic)
  
  filterGroup.conditions.forEach((condition, index) => {
    params.append(`field_${index}`, condition.field)
    params.append(`operator_${index}`, condition.operator)
    
    if (condition.custom_field_key) {
      params.append(`custom_key_${index}`, condition.custom_field_key)
    }
    
    if (Array.isArray(condition.value)) {
      params.append(`value_${index}`, condition.value.join(','))
    } else if (condition.value !== undefined && condition.value !== '') {
      params.append(`value_${index}`, String(condition.value))
    }
  })
  
  return params.toString()
}

/**
 * Generate readable description of filter
 */
export function describeFilter(filterGroup: FilterGroup): string {
  if (filterGroup.conditions.length === 0) {
    return 'No filters applied'
  }
  
  const descriptions = filterGroup.conditions.map(condition => {
    const field = FILTER_FIELDS[condition.field]
    const operator = OPERATOR_LABELS[condition.operator]
    
    let value = ''
    if (condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty') {
      if (Array.isArray(condition.value)) {
        value = condition.value.join(', ')
      } else {
        value = String(condition.value)
      }
    }
    
    return `${field.label} ${operator}${value ? ' ' + value : ''}`
  })
  
  return descriptions.join(` ${filterGroup.logic} `)
}
