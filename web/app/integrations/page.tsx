'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plug, Check, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { AVAILABLE_INTEGRATIONS, IntegrationType } from '@/lib/types/integrations'
import RequireAuth from '@/components/RequireAuth'
import { cn } from '@/lib/utils'

function IntegrationsPageContent() {
  const [activeIntegrations] = useState<Set<IntegrationType>>(new Set())
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null)

  const categories = Array.from(
    new Set(Object.values(AVAILABLE_INTEGRATIONS).map(i => i.category))
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600 mt-1">
              Connect EverReach with your favorite tools
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Integrations</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Connect your tools</strong> - Sync with Gmail, Outlook, Slack, and more</li>
          <li>• <strong>Automate workflows</strong> - Use Zapier or webhooks for custom automation</li>
          <li>• <strong>Two-way sync</strong> - Keep data in sync across all your apps</li>
          <li>• <strong>Secure connections</strong> - OAuth 2.0 and encrypted credentials</li>
        </ul>
      </div>

      {/* Categories */}
      {categories.map(category => {
        const integrationsInCategory = Object.entries(AVAILABLE_INTEGRATIONS).filter(
          ([_, config]) => config.category === category
        )

        return (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsInCategory.map(([type, config]) => (
                <IntegrationCard
                  key={type}
                  type={type as IntegrationType}
                  config={config}
                  isConnected={activeIntegrations.has(type as IntegrationType)}
                  onConnect={() => setSelectedIntegration(type as IntegrationType)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Integration Modal */}
      {selectedIntegration && (
        <IntegrationModal
          integration={AVAILABLE_INTEGRATIONS[selectedIntegration]}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  )
}

function IntegrationCard({
  type,
  config,
  isConnected,
  onConnect,
}: {
  type: IntegrationType
  config: typeof AVAILABLE_INTEGRATIONS[IntegrationType]
  isConnected: boolean
  onConnect: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{config.name}</h3>
            {config.comingSoon && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">
                Coming Soon
              </span>
            )}
          </div>
        </div>
        {isConnected && (
          <div className="p-1.5 bg-green-100 rounded-full">
            <Check className="h-4 w-4 text-green-600" />
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{config.description}</p>

      {/* Features */}
      <ul className="space-y-1 text-sm text-gray-700 mb-4">
        {config.features.slice(0, 3).map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-gray-400">•</span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Action Button */}
      {config.comingSoon ? (
        <Button variant="secondary" disabled className="w-full">
          Coming Soon
        </Button>
      ) : isConnected ? (
        <Button variant="secondary" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      ) : (
        <Button onClick={onConnect} className="w-full">
          <Plug className="h-4 w-4 mr-2" />
          Connect
        </Button>
      )}
    </div>
  )
}

function IntegrationModal({
  integration,
  onClose,
}: {
  integration: typeof AVAILABLE_INTEGRATIONS[IntegrationType]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{integration.icon}</span>
            <h3 className="text-2xl font-bold text-gray-900">{integration.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">{integration.description}</p>

        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-gray-900">Features:</h4>
          <ul className="space-y-2">
            {integration.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-gray-700">
                <Check className="h-5 w-5 text-green-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
          <ol className="space-y-1 text-sm text-blue-800">
            <li>1. Click "Authorize" to connect your account</li>
            <li>2. Grant EverReach the necessary permissions</li>
            <li>3. Configure sync settings</li>
            <li>4. Start syncing automatically</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button className="flex-1">
            <Plug className="h-4 w-4 mr-2" />
            Authorize Connection
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <RequireAuth>
      <IntegrationsPageContent />
    </RequireAuth>
  )
}
