import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render an input field', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should have correct default classes', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveClass('flex');
    expect(input).toHaveClass('border');
  });

  it('should accept value prop', () => {
    render(<Input value="test value" readOnly />);
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled data-testid="disabled-input" />);
    expect(screen.getByTestId('disabled-input')).toBeDisabled();
  });

  it('should accept type prop', () => {
    render(<Input type="email" data-testid="email-input" />);
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
  });
});
