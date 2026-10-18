'use client'

import { useState } from 'react'
import { FileText, Search, X } from 'lucide-react'
import { useTemplates, useRecordTemplateUsage } from '@/lib/hooks/useTemplates'
import { MessageTemplate, TEMPLATE_CATEGORIES, replaceVariables } from '@/lib/types/templates'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  onSelect: (template: MessageTemplate, filledBody: string, filledSubject?: string) => void
  channel?: 'email' | 'sms' | 'dm' | 'any'
  contactData?: Record<string, string>
  onClose?: () => void
}

export function TemplateSelector({ 
  onSelect, 
  channel = 'any',
  contactData = {},
  onClose 
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const { data: templates, isLoading } = useTemplates({ 
    channel, 
    active_only: true 
  })
  const recordUsage = useRecordTemplateUsage()

  // Filter templates
  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.body.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleSelectTemplate = async (template: MessageTemplate) => {
    // Replace variables in template
    const filledBody = replaceVariables(template.body, contactData)
    const filledSubject = template.subject ? replaceVariables(template.subject, contactData) : undefined

    // Record usage
    try {
      await recordUsage.mutateAsync(template.id)
    } catch (error) {
      // Non-blocking, just log
      console.error('Failed to record template usage:', error)
    }

    onSelect(template, filledBody, filledSubject)
  }

  // Get unique categories from templates
  const categories = templates ? 
    Array.from(new Set(templates.map(t => t.category))) : []

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Select Template</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            All
          </button>
          {categories.map(category => {
            const categoryData = TEMPLATE_CATEGORIES[category]
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {categoryData.icon} {categoryData.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Templates List */}
      <div className="p-4 overflow-y-auto max-h-[400px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : !filteredTemplates || filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No templates found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{TEMPLATE_CATEGORIES[template.category].icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {template.body.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400 capitalize">{template.channel}</span>
                      {template.use_count > 0 && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-400">Used {template.use_count}x</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Inline version for use in smaller spaces
export function TemplateQuickSelect({
  onSelect,
  channel = 'any',
  contactData = {},
}: Omit<TemplateSelectorProps, 'onClose'>) {
  const { data: templates } = useTemplates({ channel, active_only: true })
  const recordUsage = useRecordTemplateUsage()

  const popularTemplates = templates?.slice(0, 3) || []

  const handleSelect = async (template: MessageTemplate) => {
    const filledBody = replaceVariables(template.body, contactData)
    const filledSubject = template.subject ? replaceVariables(template.subject, contactData) : undefined

    try {
      await recordUsage.mutateAsync(template.id)
    } catch (error) {
      console.error('Failed to record template usage:', error)
    }

    onSelect(template, filledBody, filledSubject)
  }

  if (!popularTemplates.length) return null

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Quick Templates</label>
      <div className="flex flex-wrap gap-2">
        {popularTemplates.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelect(template)}
            className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition-colors"
          >
            {TEMPLATE_CATEGORIES[template.category].icon} {template.name}
          </button>
        ))}
      </div>
    </div>
  )
}
