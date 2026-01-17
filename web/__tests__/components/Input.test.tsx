import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

/**
 * Pure UI Input/FormField Component Tests
 * 
 * Tests for form input components with labels, errors, etc.
 * Replace with actual import when available.
 */

// Mock Input component
// Replace with: import { Input } from '@/components/ui/Input'
const Input = ({ 
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props 
}: any) => (
  <div className={`input-wrapper ${className}`}>
    {label && (
      <label htmlFor={props.id}>
        {label}
        {required && <span className="required">*</span>}
      </label>
    )}
    <input
      {...props}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
    />
    {error && (
      <span id={`${props.id}-error`} className="error-message" role="alert">
        {error}
      </span>
    )}
    {helperText && !error && (
      <span id={`${props.id}-helper`} className="helper-text">
        {helperText}
      </span>
    )}
  </div>
)

describe('Input Component', () => {
  it('renders input field', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input id="email" label="Email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows required indicator', () => {
    render(<Input id="name" label="Name" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input onChange={handleChange} placeholder="Type here" />)
    
    const input = screen.getByPlaceholderText('Type here')
    await user.type(input, 'Hello')
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('Hello')
  })

  it('displays error message', () => {
    render(<Input id="email" label="Email" error="Invalid email" />)
    
    const errorMessage = screen.getByRole('alert')
    expect(errorMessage).toHaveTextContent('Invalid email')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('displays helper text', () => {
    render(<Input id="password" label="Password" helperText="Must be 8+ characters" />)
    expect(screen.getByText('Must be 8+ characters')).toBeInTheDocument()
  })

  it('error takes precedence over helper text', () => {
    render(
      <Input 
        id="email" 
        label="Email" 
        error="Invalid email"
        helperText="Enter your email" 
      />
    )
    
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="text" placeholder="Text" />)
    expect(screen.getByPlaceholderText('Text')).toHaveAttribute('type', 'text')
    
    rerender(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')
    
    rerender(<Input type="password" placeholder="Password" />)
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
  })

  it('applies custom className', () => {
    const { container } = render(<Input className="custom-input" />)
    expect(container.firstChild).toHaveClass('custom-input')
  })

  it('supports controlled input', async () => {
    const user = userEvent.setup()
    
    const ControlledInput = () => {
      const [value, setValue] = React.useState('')
      return (
        <Input 
          value={value} 
          onChange={(e: any) => setValue(e.target.value)}
          placeholder="Controlled"
        />
      )
    }
    
    render(<ControlledInput />)
    
    const input = screen.getByPlaceholderText('Controlled')
    await user.type(input, 'Test')
    
    expect(input).toHaveValue('Test')
  })

  it('has proper accessibility attributes', () => {
    render(
      <Input 
        id="test-input"
        label="Test Label"
        error="Test error"
        required
      />
    )
    
    const input = screen.getByLabelText(/Test Label/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
  })
})

// Add React import for controlled input test
import React from 'react'
