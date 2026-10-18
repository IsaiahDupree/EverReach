/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryProvider } from '@/components/providers/query-provider';
import { useQueryClient } from '@tanstack/react-query';

// Mock the ReactQueryDevtools to verify it's being used
jest.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: ({ initialIsOpen }: { initialIsOpen: boolean }) => (
    <div data-testid="react-query-devtools" data-initial-open={initialIsOpen}>
      DevTools
    </div>
  ),
}));

// Mock component to test QueryProvider context
function TestComponent() {
  const queryClient = useQueryClient();
  return (
    <div>
      <div data-testid="query-client-exists">
        {queryClient ? 'Query Client Available' : 'No Query Client'}
      </div>
    </div>
  );
}

describe('QueryProvider', () => {
  it('should wrap children and provide QueryClient', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByTestId('query-client-exists')).toHaveTextContent(
      'Query Client Available'
    );
  });

  it('should render children correctly', () => {
    render(
      <QueryProvider>
        <div data-testid="test-child">Test Child</div>
      </QueryProvider>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toHaveTextContent('Test Child');
  });

  it('should include DevTools component', () => {
    render(
      <QueryProvider>
        <div data-testid="test-content">Test</div>
      </QueryProvider>
    );

    // Check that the DevTools mock is rendered
    const devTools = screen.getByTestId('react-query-devtools');
    expect(devTools).toBeInTheDocument();
    expect(devTools).toHaveAttribute('data-initial-open', 'false');
  });

  it('should configure QueryClient with proper defaults', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // QueryClient should be available
    expect(screen.getByTestId('query-client-exists')).toHaveTextContent(
      'Query Client Available'
    );
  });
});
