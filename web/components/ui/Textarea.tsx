import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, disabled, className, id, ...props }, ref) => {
    const textareaId = id || props.name || `textarea-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error 
              ? `${textareaId}-error` 
              : helperText 
              ? `${textareaId}-helper` 
              : undefined
          }
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500',
            error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300',
            'transition-colors resize-y min-h-[80px]'
          )}
          {...props}
        />
        {error && (
          <p 
            id={`${textareaId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${textareaId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
