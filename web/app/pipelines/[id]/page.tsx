'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, BarChart3, Settings } from 'lucide-react'
import { usePipeline, usePipelineMetrics } from '@/lib/hooks/usePipelines'
import { KanbanBoard } from '@/components/Pipelines/KanbanBoard'
import { Button, LoadingScreen } from '@/components/ui'
import { formatCurrency } from '@/lib/types/pipelines'
import RequireAuth from '@/components/RequireAuth'

function PipelinePageContent() {
  const params = useParams<{ id: string }>()
  const pipelineId = params?.id

  const { data: pipeline, isLoading } = usePipeline(pipelineId)
  const { data: metrics } = usePipelineMetrics(pipelineId)

  if (isLoading) {
    return <LoadingScreen message="Loading pipeline..." />
  }

  if (!pipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Pipeline not found</p>
        <Link href="/pipelines">
          <Button className="mt-4">Back to Pipelines</Button>
        </Link>
      </div>
    )
  }

  const stages = pipeline.stages || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pipelines">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pipeline.name}</h1>
            {pipeline.description && (
              <p className="text-gray-600 mt-1">{pipeline.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/pipelines/${pipelineId}/analytics` as any}>
            <Button variant="secondary" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href={`/pipelines/${pipelineId}/settings` as any}>
            <Button variant="secondary" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Contacts</div>
            <div className="text-2xl font-bold text-gray-900">{metrics.total_contacts}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics.total_value)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Weighted Value</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics.weighted_value)}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics.conversion_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">Pipeline Tips</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Drag & drop</strong> contacts between stages to update their status</li>
          <li>• <strong>Click a contact</strong> to view details and edit information</li>
          <li>• <strong>Add contacts</strong> using the + button in each stage</li>
          <li>• Track <strong>expected value</strong> and <strong>probability</strong> for forecasting</li>
        </ul>
      </div>

      {/* Kanban Board */}
      {stages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No stages defined for this pipeline</p>
          <Link href={`/pipelines/${pipelineId}/settings` as any}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Stages
            </Button>
          </Link>
        </div>
      ) : (
        <KanbanBoard
          pipelineId={pipelineId}
          stages={stages}
          onAddContact={(stageId) => {
            // TODO: Open modal to add contact
            console.log('Add contact to stage:', stageId)
          }}
        />
      )}
    </div>
  )
}

export default function PipelinePage() {
  return (
    <RequireAuth>
      <PipelinePageContent />
    </RequireAuth>
  )
}
