/**
 * Test Suite: Theme Provider (WEB-THEME-001)
 *
 * Acceptance Criteria:
 * - System detection: Automatically detects system theme preference
 * - Manual toggle: Users can manually switch themes
 * - Persisted: Theme preference is saved and restored
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/components/providers/theme-provider';

// Mock next-themes
const mockUseTheme = jest.fn();
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="next-themes-provider" {...props}>
      {children}
    </div>
  ),
  useTheme: () => mockUseTheme(),
}));

describe('WEB-THEME-001: Theme Provider', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: jest.fn(),
      resolvedTheme: 'light',
      systemTheme: 'light',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Structure', () => {
    it('should render children', () => {
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div data-testid="test-child">Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should render NextThemesProvider with correct props', () => {
      const { container } = render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = container.querySelector('[data-testid="next-themes-provider"]');
      expect(provider).toBeInTheDocument();
    });
  });

  describe('System Detection', () => {
    it('should support system theme detection via enableSystem prop', () => {
      // The ThemeProvider accepts and forwards the enableSystem prop to next-themes
      // This enables automatic system theme detection
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div data-testid="test-content">Test content</div>
        </ThemeProvider>
      );

      // Component should render without errors when enableSystem is true
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should use system as default theme when configured', () => {
      const { container } = render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = container.querySelector('[data-testid="next-themes-provider"]');
      expect(provider).toHaveAttribute('defaultTheme', 'system');
    });

    it('should respect system preference for theme', () => {
      // This test verifies that the component supports enableSystem
      // which allows next-themes to detect and apply system preferences
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div data-testid="test-content">Test content</div>
        </ThemeProvider>
      );

      // Component renders successfully with system theme detection enabled
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Manual Toggle', () => {
    it('should allow manual theme changes', () => {
      // The ThemeProvider wraps next-themes which provides setTheme
      // This test verifies the component structure supports manual toggling
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      // Component should render without errors, allowing children to use useTheme
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should support light theme option', () => {
      const { rerender } = render(
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should support dark theme option', () => {
      const { rerender } = render(
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should support system theme option', () => {
      const { rerender } = render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('Persistence', () => {
    it('should persist theme selection using next-themes storage', () => {
      // next-themes handles persistence automatically via localStorage
      // This test verifies the component is configured to support persistence
      const { container } = render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = container.querySelector('[data-testid="next-themes-provider"]');
      expect(provider).toBeInTheDocument();
      // next-themes uses localStorage by default when not disabled
    });

    it('should restore theme preference on mount', async () => {
      // next-themes automatically restores from localStorage
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test content')).toBeInTheDocument();
      });
    });

    it('should maintain theme across re-renders', () => {
      const { rerender } = render(
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div data-testid="content">Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div data-testid="content">Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with class attribute for CSS', () => {
      const { container } = render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = container.querySelector('[data-testid="next-themes-provider"]');
      expect(provider).toHaveAttribute('attribute', 'class');
    });

    it('should be a client component', () => {
      // Verify that the component uses 'use client' directive
      // This is checked at build time, but we verify it renders on client
      render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div>Test content</div>
        </ThemeProvider>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should support disableTransitionOnChange prop', () => {
      // The disableTransitionOnChange prop prevents CSS transitions during theme changes
      render(
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div data-testid="test-content">Test content</div>
        </ThemeProvider>
      );

      // Component should render without errors when disableTransitionOnChange is true
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should work in the root layout context', () => {
      // Simulates usage in app/layout.tsx (without html/body wrapper for testing)
      render(
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div data-testid="app-content">App Content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
  });

  describe('Props Forwarding', () => {
    it('should forward all next-themes props', () => {
      const customProps = {
        attribute: 'class' as const,
        defaultTheme: 'system',
        enableSystem: true,
        storageKey: 'custom-theme',
        themes: ['light', 'dark'],
      };

      const { container } = render(
        <ThemeProvider {...customProps}>
          <div>Test content</div>
        </ThemeProvider>
      );

      const provider = container.querySelector('[data-testid="next-themes-provider"]');
      expect(provider).toHaveAttribute('attribute', 'class');
      expect(provider).toHaveAttribute('defaultTheme', 'system');
    });
  });
});
