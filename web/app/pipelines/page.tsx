'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, Users, DollarSign } from 'lucide-react'
import { usePipelines } from '@/lib/hooks/usePipelines'
import { Button } from '@/components/ui'
import { Pipeline, getPipelineColorClass } from '@/lib/types/pipelines'
import RequireAuth from '@/components/RequireAuth'

function PipelinesPageContent() {
  const { data: pipelines, isLoading } = usePipelines()

  const activePipelines = pipelines?.filter(p => !p.is_archived) || []
  const archivedPipelines = pipelines?.filter(p => p.is_archived) || []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-600 mt-1">
            Manage your sales pipelines and track deals visually
          </p>
        </div>
        <Button onClick={() => { /* TODO: Open create modal */ }}>
          <Plus className="h-4 w-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Pipelines</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Organize deals</strong> by creating custom stages</li>
          <li>• <strong>Visual Kanban board</strong> for drag & drop management</li>
          <li>• <strong>Track revenue</strong> with expected values and probability</li>
          <li>• <strong>Multiple pipelines</strong> for different processes</li>
        </ul>
      </div>

      {/* Active Pipelines */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : activePipelines.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="rounded-full bg-gray-200 w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-2">No pipelines yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Create your first pipeline to start tracking deals
          </p>
          <Button onClick={() => { /* TODO: Open create modal */ }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePipelines.map((pipeline) => (
            <PipelineCard key={pipeline.id} pipeline={pipeline} />
          ))}
        </div>
      )}

      {/* Archived Pipelines */}
      {archivedPipelines.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Archived Pipelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedPipelines.map((pipeline) => (
              <PipelineCard key={pipeline.id} pipeline={pipeline} isArchived />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {activePipelines.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-medium text-gray-900 mb-3">Pipeline Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>
              <strong>Multiple pipelines:</strong> Create separate pipelines for different processes (e.g., Sales, Partnerships, Hiring)
            </div>
            <div>
              <strong>Custom stages:</strong> Add stages that match your workflow (e.g., Prospecting, Demo, Negotiation, Closed)
            </div>
            <div>
              <strong>Track value:</strong> Add expected deal value and win probability for accurate forecasting
            </div>
            <div>
              <strong>Visual management:</strong> Drag and drop contacts between stages to update their status instantly
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineCard({ pipeline, isArchived = false }: { pipeline: Pipeline; isArchived?: boolean }) {
  return (
    <Link href={`/pipelines/${pipeline.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
        {/* Color Bar */}
        <div className={`h-1 w-12 rounded mb-4 ${getPipelineColorClass(pipeline.color)}`} />

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2">
          {pipeline.name}
          {isArchived && (
            <span className="text-xs text-gray-500 ml-2">(Archived)</span>
          )}
        </h3>

        {/* Description */}
        {pipeline.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {pipeline.description}
          </p>
        )}

        {/* Placeholder Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <Users className="h-3 w-3" />
              <span>Contacts</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">-</div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              <span>Value</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">-</div>
          </div>
        </div>

        {/* Default Badge */}
        {pipeline.is_default && (
          <div className="mt-3">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
              Default
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function PipelinesPage() {
  return (
    <RequireAuth>
      <PipelinesPageContent />
    </RequireAuth>
  )
}
