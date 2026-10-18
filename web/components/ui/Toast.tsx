"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Transition } from '@headlessui/react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

interface ToastContextValue {
  showToast: (type: Toast['type'], message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: Toast['type'], message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { id, type, message, duration }
    
    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <Transition
            key={toast.id}
            show={true}
            enter="transform transition duration-300"
            enterFrom="translate-x-full opacity-0"
            enterTo="translate-x-0 opacity-100"
            leave="transform transition duration-200"
            leaveFrom="translate-x-0 opacity-100"
            leaveTo="translate-x-full opacity-0"
          >
            <ToastMessage toast={toast} onDismiss={() => dismissToast(toast.id)} />
          </Transition>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastMessage({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  }

  const styles = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg',
        styles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium text-gray-900">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
