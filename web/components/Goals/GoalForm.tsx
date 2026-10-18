'use client'

import { useState } from 'react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { Goal, GoalType, GoalPeriod, GOAL_TYPE_CONFIG, GOAL_PERIODS } from '@/lib/types/goals'

interface GoalFormProps {
  goal?: Goal
  onSave: (goal: Partial<Goal>) => void
  onCancel: () => void
  isSaving?: boolean
}

const goalTypeOptions = Object.entries(GOAL_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: `${config.icon} ${config.label}`,
}))

export function GoalForm({ goal, onSave, onCancel, isSaving = false }: GoalFormProps) {
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    description: goal?.description || '',
    goal_type: goal?.goal_type || 'interactions',
    target_value: goal?.target_value || 0,
    period: goal?.period || 'weekly',
    start_date: goal?.start_date ? goal.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
    end_date: goal?.end_date ? goal.end_date.split('T')[0] : '',
    tags: goal?.tags?.join(', ') || '',
  })

  const selectedType = GOAL_TYPE_CONFIG[formData.goal_type as GoalType]
  const showCustomDates = formData.period === 'custom'

  // Auto-calculate end date based on period
  const handlePeriodChange = (period: string) => {
    setFormData(prev => {
      const startDate = new Date(prev.start_date || new Date())
      let endDate = new Date(startDate)

      switch (period) {
        case 'daily':
          endDate.setDate(startDate.getDate() + 1)
          break
        case 'weekly':
          endDate.setDate(startDate.getDate() + 7)
          break
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + 1)
          break
        case 'quarterly':
          endDate.setMonth(startDate.getMonth() + 3)
          break
        case 'yearly':
          endDate.setFullYear(startDate.getFullYear() + 1)
          break
        default:
          // custom - don't auto-set
          return { ...prev, period: period as GoalPeriod }
      }

      return {
        ...prev,
        period: period as GoalPeriod,
        end_date: endDate.toISOString().split('T')[0],
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: Partial<Goal> = {
      name: formData.name,
      description: formData.description || undefined,
      goal_type: formData.goal_type as GoalType,
      target_value: Number(formData.target_value),
      period: formData.period as GoalPeriod,
      start_date: new Date(formData.start_date || new Date()).toISOString(),
      end_date: new Date(formData.end_date || new Date()).toISOString(),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    }

    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Basic Information</h3>

        <Input
          label="Goal Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Touch 20 contacts this week"
          helperText="A clear, actionable name for your goal"
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Why is this goal important?"
        />

        <Select
          label="Goal Type"
          required
          value={formData.goal_type}
          onChange={(e) => setFormData({ ...formData, goal_type: e.target.value as GoalType })}
          options={goalTypeOptions}
        />

        {selectedType && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {selectedType.description}
          </div>
        )}
      </div>

      {/* Target & Period */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Target & Timeline</h3>

        <Input
          label={`Target (${selectedType.unit})`}
          type="number"
          required
          min="1"
          value={formData.target_value}
          onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
          placeholder="e.g., 20"
          helperText={`Number of ${selectedType.unit} you want to achieve`}
        />

        <Select
          label="Period"
          required
          value={formData.period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          options={GOAL_PERIODS}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />

          <Input
            label="End Date"
            type="date"
            required
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            disabled={!showCustomDates}
            helperText={showCustomDates ? undefined : 'Auto-calculated from period'}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <Input
          label="Tags (comma-separated)"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="e.g., sales, networking, Q4"
          helperText="Optional tags to organize your goals"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={isSaving}
        >
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  )
}
