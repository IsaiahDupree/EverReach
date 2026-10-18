'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Target } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { GoalsList } from '@/components/Goals/GoalsList'
import { GoalForm } from '@/components/Goals/GoalForm'
import { useCreateGoal, useUpdateGoal } from '@/lib/hooks/useGoals'
import { Goal } from '@/lib/types/goals'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'

function GoalsPageContent() {
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>()

  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()

  const handleNew = () => {
    setEditingGoal(undefined)
    setShowForm(true)
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setShowForm(true)
  }

  const handleSave = async (goalData: Partial<Goal>) => {
    try {
      if (editingGoal?.id) {
        await updateGoal.mutateAsync({
          id: editingGoal.id,
          updates: goalData,
        })
        showToast('success', 'Goal updated successfully')
      } else {
        await createGoal.mutateAsync(goalData as any)
        showToast('success', 'Goal created successfully')
      }
      setShowForm(false)
      setEditingGoal(undefined)
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save goal')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingGoal(undefined)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
            <p className="text-gray-600 mt-1">
              Set and track your relationship management goals
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        )}
      </div>

      {/* Info Card */}
      {!showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900 mb-2">About Goals</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Track progress</strong> with visual progress bars and metrics</li>
            <li>• <strong>Stay on schedule</strong> with timeline tracking and alerts</li>
            <li>• <strong>Multiple goal types</strong> for interactions, contacts, revenue, and more</li>
            <li>• <strong>Flexible periods</strong> from daily to yearly goals</li>
          </ul>
        </div>
      )}

      {/* Form or List */}
      {showForm ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <GoalForm
            goal={editingGoal}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={createGoal.isPending || updateGoal.isPending}
          />
        </div>
      ) : (
        <GoalsList onEdit={handleEdit} onNew={handleNew} />
      )}

      {/* Goal Types Reference */}
      {!showForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900 mb-3">Goal Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <strong>💬 Interactions:</strong> Track number of interactions with contacts
            </div>
            <div>
              <strong>👥 New Contacts:</strong> Add new contacts to your network
            </div>
            <div>
              <strong>🔥 Warmth Score:</strong> Maintain relationship warmth above target
            </div>
            <div>
              <strong>📊 Pipeline Deals:</strong> Close deals in your pipeline
            </div>
            <div>
              <strong>💰 Revenue:</strong> Achieve revenue targets
            </div>
            <div>
              <strong>📅 Meetings:</strong> Schedule and complete meetings
            </div>
            <div>
              <strong>⏰ Follow-ups:</strong> Complete timely follow-ups
            </div>
            <div>
              <strong>🎯 Custom Goal:</strong> Track any custom metric
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GoalsPage() {
  return (
    <RequireAuth>
      <GoalsPageContent />
    </RequireAuth>
  )
}
