'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Zap, MoreVertical, Power, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { 
  useAutomationRules, 
  useDeleteAutomationRule,
  useToggleAutomationRule 
} from '@/lib/hooks/useAutomation'
import { TRIGGER_TYPES, ACTION_TYPES, AutomationRule } from '@/lib/types/automation'
import { useToast } from '@/components/ui/Toast'
import RequireAuth from '@/components/RequireAuth'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

function AutomationPageContent() {
  const { showToast } = useToast()
  const { data: rules, isLoading } = useAutomationRules(true)
  const deleteRule = useDeleteAutomationRule()
  const toggleRule = useToggleAutomationRule()

  const [showCreateForm, setShowCreateForm] = useState(false)

  const activeRules = rules?.filter(r => r.is_active) || []
  const inactiveRules = rules?.filter(r => !r.is_active) || []

  const handleToggle = async (rule: AutomationRule) => {
    try {
      await toggleRule.mutateAsync({ id: rule.id, isActive: !rule.is_active })
      showToast('success', `Rule ${rule.is_active ? 'disabled' : 'enabled'}`)
    } catch (error) {
      showToast('error', 'Failed to toggle rule')
    }
  }

  const handleDelete = async (rule: AutomationRule) => {
    if (!confirm(`Delete automation rule "${rule.name}"?`)) {
      return
    }

    try {
      await deleteRule.mutateAsync(rule.id)
      showToast('success', 'Rule deleted')
    } catch (error) {
      showToast('error', 'Failed to delete rule')
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Automation Rules</h1>
            <p className="text-gray-600 mt-1">
              Automate your relationship management workflow
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Automation</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Automate workflows</strong> based on triggers like warmth changes or time</li>
          <li>• <strong>Take actions</strong> automatically - add tags, send notifications, create tasks</li>
          <li>• <strong>Save time</strong> by automating repetitive relationship management tasks</li>
          <li>• <strong>Stay on top</strong> of your network with proactive alerts</li>
        </ul>
      </div>

      {/* Active Rules */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : activeRules.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Rules</h2>
          {activeRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => handleToggle(rule)}
              onDelete={() => handleDelete(rule)}
              isDeleting={deleteRule.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <div className="rounded-full bg-gray-200 w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">No automation rules yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Create your first rule to automate your workflow
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      )}

      {/* Inactive Rules */}
      {inactiveRules.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Inactive Rules</h2>
          {inactiveRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => handleToggle(rule)}
              onDelete={() => handleDelete(rule)}
              isDeleting={deleteRule.isPending}
            />
          ))}
        </div>
      )}

      {/* Example Rules */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Example Automation Rules</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-medium text-gray-900">Re-engagement Alert</div>
              <div className="text-gray-600">When warmth drops below 40 → Send notification</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="font-medium text-gray-900">Follow-up Reminder</div>
              <div className="text-gray-600">When no touch for 30 days → Add "needs-follow-up" tag</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏷️</span>
            <div>
              <div className="font-medium text-gray-900">VIP Treatment</div>
              <div className="text-gray-600">When "vip" tag added → Set watch status to VIP</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <div className="font-medium text-gray-900">Pipeline Automation</div>
              <div className="text-gray-600">When moved to "Closed Won" → Send celebration notification</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
  isDeleting,
}: {
  rule: AutomationRule
  onToggle: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const triggerInfo = TRIGGER_TYPES[rule.trigger_type]
  const actionsInfo = rule.actions.map(a => ACTION_TYPES[a.type])

  return (
    <div className={cn(
      'rounded-lg border border-gray-200 bg-white p-6',
      !rule.is_active && 'bg-gray-50 opacity-75'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{triggerInfo.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{rule.name}</h3>
              {rule.is_active ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                  Active
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                  Inactive
                </span>
              )}
            </div>
            {rule.description && (
              <p className="text-sm text-gray-600">{rule.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className={cn(
              'p-2 rounded transition-colors',
              rule.is_active 
                ? 'text-green-600 hover:bg-green-50' 
                : 'text-gray-400 hover:bg-gray-100'
            )}
            title={rule.is_active ? 'Disable' : 'Enable'}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Trigger */}
        <div className="flex items-start gap-2 text-sm">
          <div className="font-medium text-gray-700 min-w-[80px]">When:</div>
          <div className="text-gray-900">{triggerInfo.label}</div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-2 text-sm">
          <div className="font-medium text-gray-700 min-w-[80px]">Then:</div>
          <div className="space-y-1">
            {actionsInfo.map((action, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-900">
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-xs text-gray-500 pt-3 border-t border-gray-200">
          <div>Triggered <strong>{rule.trigger_count}</strong> times</div>
          {rule.last_triggered_at && (
            <div>Last: {formatDateTime(rule.last_triggered_at)}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AutomationPage() {
  return (
    <RequireAuth>
      <AutomationPageContent />
    </RequireAuth>
  )
}
