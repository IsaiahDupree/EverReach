'use client'

import { useState } from 'react'
import { Plus, X, Save, Filter as FilterIcon } from 'lucide-react'
import { Button, Select, Input } from '@/components/ui'
import { 
  FilterGroup, 
  FilterCondition, 
  FILTER_FIELDS, 
  OPERATOR_LABELS,
  FilterField,
  FilterOperator,
  describeFilter
} from '@/lib/types/filters'
import { useSaveFilter } from '@/lib/hooks/useFilters'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface AdvancedFilterBuilderProps {
  value: FilterGroup
  onChange: (filterGroup: FilterGroup) => void
  onApply: () => void
  onClear: () => void
}

export function AdvancedFilterBuilder({ 
  value, 
  onChange, 
  onApply,
  onClear 
}: AdvancedFilterBuilderProps) {
  const { showToast } = useToast()
  const saveFilter = useSaveFilter()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Math.random().toString(36).substr(2, 9),
      field: 'warmth_score',
      operator: 'greater_than',
      value: '',
    }

    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    })
  }

  const removeCondition = (id: string) => {
    onChange({
      ...value,
      conditions: value.conditions.filter(c => c.id !== id),
    })
  }

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })
  }

  const toggleLogic = () => {
    onChange({
      ...value,
      logic: value.logic === 'AND' ? 'OR' : 'AND',
    })
  }

  const handleSave = async () => {
    if (!filterName.trim()) {
      showToast('error', 'Please enter a filter name')
      return
    }

    try {
      await saveFilter.mutateAsync({
        name: filterName,
        filter_group: value,
      })
      showToast('success', 'Filter saved successfully')
      setShowSaveDialog(false)
      setFilterName('')
    } catch (error) {
      showToast('error', 'Failed to save filter')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          {value.conditions.length > 1 && (
            <button
              onClick={toggleLogic}
              className="px-3 py-1 text-sm font-medium rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {value.logic}
            </button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            disabled={value.conditions.length === 0}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            />
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={saveFilter.isPending}
            >
              Save
            </Button>
            <button
              onClick={() => {
                setShowSaveDialog(false)
                setFilterName('')
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="space-y-3">
        {value.conditions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No filters applied. Add a condition to get started.
          </div>
        ) : (
          value.conditions.map((condition, index) => (
            <div key={condition.id}>
              {index > 0 && (
                <div className="text-xs text-gray-500 font-medium my-2 text-center">
                  {value.logic}
                </div>
              )}
              <FilterConditionRow
                condition={condition}
                onChange={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Add Condition Button */}
      <button
        onClick={addCondition}
        className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm"
      >
        <Plus className="h-4 w-4" />
        Add Condition
      </button>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {value.conditions.length > 0 && describeFilter(value)}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClear}
            disabled={value.conditions.length === 0}
          >
            Clear All
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={value.conditions.length === 0}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: FilterCondition
  onChange: (updates: Partial<FilterCondition>) => void
  onRemove: () => void
}) {
  const fieldConfig = FILTER_FIELDS[condition.field]
  const operatorOptions = fieldConfig.operators.map(op => ({
    value: op,
    label: OPERATOR_LABELS[op],
  }))

  const showValueInput = 
    condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty'

  return (
    <div className="flex items-center gap-2">
      {/* Field Selector */}
      <Select
        value={condition.field}
        onChange={(e) => onChange({ 
          field: e.target.value as FilterField,
          // Reset operator when field changes
          operator: FILTER_FIELDS[e.target.value as FilterField].operators[0]
        })}
        options={Object.entries(FILTER_FIELDS).map(([value, config]) => ({
          value,
          label: config.label,
        }))}
        className="flex-1"
      />

      {/* Operator Selector */}
      <Select
        value={condition.operator}
        onChange={(e) => onChange({ operator: e.target.value as FilterOperator })}
        options={operatorOptions}
        className="flex-1"
      />

      {/* Value Input */}
      {showValueInput && (
        <div className="flex-1">
          {fieldConfig.type === 'select' && fieldConfig.options ? (
            <Select
              value={String(condition.value)}
              onChange={(e) => onChange({ value: e.target.value })}
              options={fieldConfig.options}
            />
          ) : (
            <Input
              type={fieldConfig.type === 'number' ? 'number' : 'text'}
              value={String(condition.value || '')}
              onChange={(e) => onChange({ 
                value: fieldConfig.type === 'number' ? Number(e.target.value) : e.target.value 
              })}
              placeholder="Value..."
            />
          )}
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
