import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, disabled, className, id, ...props }, ref) => {
    const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error 
              ? `${inputId}-error` 
              : helperText 
              ? `${inputId}-helper` 
              : undefined
          }
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500',
            error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300',
            'transition-colors'
          )}
          {...props}
        />
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
