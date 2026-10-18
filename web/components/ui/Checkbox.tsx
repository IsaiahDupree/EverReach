import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, helperText, disabled, className, id, ...props }, ref) => {
    const checkboxId = id || props.name || `checkbox-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={
                error 
                  ? `${checkboxId}-error` 
                  : helperText 
                  ? `${checkboxId}-helper` 
                  : undefined
              }
              className={cn(
                'w-4 h-4 rounded border-gray-300 text-blue-600',
                'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error && 'border-red-500',
                'transition-colors cursor-pointer'
              )}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3 text-sm">
              <label 
                htmlFor={checkboxId}
                className={cn(
                  'font-medium text-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            </div>
          )}
        </div>
        {error && (
          <p 
            id={`${checkboxId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${checkboxId}-helper`}
            className="mt-1 ml-7 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
