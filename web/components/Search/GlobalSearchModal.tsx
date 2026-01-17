'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight } from 'lucide-react'
import { useGlobalSearch, formatSearchResult, SearchResult } from '@/lib/hooks/useGlobalSearch'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: searchResults, isLoading } = useGlobalSearch(query, isOpen)

  const results = searchResults?.results || []

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        handleSelectResult(results[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelectResult = (result: SearchResult) => {
    router.push(result.url as any)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-[10vh]">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[70vh] overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, interactions, templates..."
              className="flex-1 text-lg outline-none"
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
          {isLoading && query.length >= 2 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
              Searching...
            </div>
          ) : query.length < 2 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Type to search across your CRM</p>
              <p className="text-xs text-gray-400 mt-1">
                Contacts • Interactions • Notes • Templates
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No results found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  isSelected={index === selectedIndex}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {query.length >= 2 && results.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <span>{results.length} results</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SearchResultItem({
  result,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  result: SearchResult
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
}) {
  const { icon, badge, badgeColor } = formatSearchResult(result)

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      )}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
          {badge && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded font-medium capitalize',
                badgeColor === 'red' && 'bg-red-100 text-red-700',
                badgeColor === 'orange' && 'bg-orange-100 text-orange-700',
                badgeColor === 'yellow' && 'bg-yellow-100 text-yellow-700',
                badgeColor === 'blue' && 'bg-blue-100 text-blue-700',
                !badgeColor && 'bg-gray-100 text-gray-700'
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {result.subtitle && (
          <p className="text-sm text-gray-600">{result.subtitle}</p>
        )}

        {result.description && (
          <p className="text-sm text-gray-500 line-clamp-1 mt-1">
            {result.description}
          </p>
        )}

        {result.metadata?.tags && result.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.metadata.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {result.metadata?.occurred_at && (
          <p className="text-xs text-gray-400 mt-1">
            {formatDateTime(result.metadata.occurred_at)}
          </p>
        )}
      </div>

      <ArrowRight className={cn(
        'h-4 w-4 flex-shrink-0 transition-opacity',
        isSelected ? 'opacity-100' : 'opacity-0'
      )} />
    </button>
  )
}
