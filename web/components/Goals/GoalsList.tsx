'use client'

import { TrendingUp, Plus, Check, Edit, Trash2 } from 'lucide-react'
import { useGoals, useDeleteGoal, useCompleteGoal } from '@/lib/hooks/useGoals'
import { Goal, GOAL_TYPE_CONFIG, calculateGoalProgress, getGoalStatusColor, formatGoalValue } from '@/lib/types/goals'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

interface GoalsListProps {
  onEdit: (goal: Goal) => void
  onNew: () => void
}

export function GoalsList({ onEdit, onNew }: GoalsListProps) {
  const { showToast } = useToast()
  const { data: goals, isLoading } = useGoals({ active_only: true })
  const deleteGoal = useDeleteGoal()
  const completeGoal = useCompleteGoal()

  const handleDelete = async (goal: Goal) => {
    if (!confirm(`Delete goal "${goal.name}"?`)) {
      return
    }

    try {
      await deleteGoal.mutateAsync(goal.id)
      showToast('success', 'Goal deleted')
    } catch (error) {
      showToast('error', 'Failed to delete goal')
    }
  }

  const handleComplete = async (goal: Goal) => {
    try {
      await completeGoal.mutateAsync(goal.id)
      showToast('success', 'Goal marked as completed!')
    } catch (error) {
      showToast('error', 'Failed to complete goal')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="rounded-full bg-gray-200 w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium mb-2">No goals yet</p>
        <p className="text-sm text-gray-500 mb-4">Set your first goal to track progress</p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onEdit={() => onEdit(goal)}
          onDelete={() => handleDelete(goal)}
          onComplete={() => handleComplete(goal)}
          isDeleting={deleteGoal.isPending}
        />
      ))}
    </div>
  )
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onComplete,
  isDeleting,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  isDeleting: boolean
}) {
  const typeConfig = GOAL_TYPE_CONFIG[goal.goal_type]
  const progress = calculateGoalProgress(goal)
  const isCompleted = goal.status === 'completed'

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-6',
      isCompleted && 'bg-green-50 border-green-200'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{typeConfig.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{goal.name}</h3>
            {goal.description && (
              <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="capitalize">{goal.period}</span>
              <span>•</span>
              <span>Ends {formatDateTime(goal.end_date)}</span>
              {progress.daysRemaining > 0 && (
                <>
                  <span>•</span>
                  <span>{progress.daysRemaining} days left</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-4">
          {!isCompleted && progress.percentage >= 100 && (
            <button
              onClick={onComplete}
              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
              title="Mark as complete"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit goal"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {formatGoalValue(goal.current_value, goal.goal_type)} of {formatGoalValue(goal.target_value, goal.goal_type)} {typeConfig.unit}
          </span>
          <span className={cn(
            'font-semibold',
            progress.isOnTrack ? 'text-green-600' : 'text-orange-600'
          )}>
            {progress.percentage}%
          </span>
        </div>
        
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all',
              isCompleted ? 'bg-green-500' : 
              progress.isOnTrack ? 'bg-blue-500' : 'bg-orange-500'
            )}
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'font-medium',
            progress.isOnTrack ? 'text-green-600' : 'text-orange-600'
          )}>
            {progress.isOnTrack ? '✓ On track' : '⚠ Behind schedule'}
          </span>
          {progress.remaining > 0 && (
            <span className="text-gray-500">
              {progress.remaining} {typeConfig.unit} remaining
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      {goal.tags && goal.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
          {goal.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-3">
        <span className={cn(
          'text-xs px-2 py-1 rounded font-medium capitalize',
          getGoalStatusColor(goal.status)
        )}>
          {goal.status}
        </span>
      </div>
    </div>
  )
}
