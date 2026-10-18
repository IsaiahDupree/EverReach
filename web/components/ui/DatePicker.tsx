import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helperText?: string
  showTime?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, helperText, required, disabled, className, id, showTime = false, ...props }, ref) => {
    const datePickerId = id || props.name || `date-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label 
            htmlFor={datePickerId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={showTime ? 'datetime-local' : 'date'}
          id={datePickerId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error 
              ? `${datePickerId}-error` 
              : helperText 
              ? `${datePickerId}-helper` 
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
            id={`${datePickerId}-error`}
            className="mt-1 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${datePickerId}-helper`}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
