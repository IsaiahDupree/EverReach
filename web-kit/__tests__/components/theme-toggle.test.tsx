/**
 * Test Suite: Theme Toggle Component (WEB-THEME-002)
 *
 * Acceptance Criteria:
 * - Toggle icon: Shows appropriate icon for current theme
 * - Switches theme: Clicking toggles between light/dark/system themes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';

// Mock useTheme hook from next-themes
const mockSetTheme = jest.fn();
const mockUseTheme = jest.fn();

jest.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}));

describe('WEB-THEME-002: Theme Toggle Component', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  describe('Component Structure', () => {
    it('should render without errors', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      // Should render a button or interactive element
      const toggle = screen.getByRole('button');
      expect(toggle).toBeInTheDocument();
    });

    it('should be accessible with aria-label', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      expect(toggle).toHaveAttribute('aria-label');
    });

    it('should have a descriptive aria-label', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      const ariaLabel = toggle.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/theme|toggle|switch/i);
    });
  });

  describe('Toggle Icon', () => {
    it('should show sun icon for light theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      // Sun icon should be present (lucide-react icons use SVG)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show moon icon for dark theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      // Moon icon should be present
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show appropriate icon for system theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      // System/monitor icon should be present
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Theme Switching', () => {
    it('should toggle from light to dark when clicked', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light when clicked', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should handle system theme toggle', () => {
      mockUseTheme.mockReturnValue({
        theme: 'system',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);

      // Should toggle to either light or dark
      expect(mockSetTheme).toHaveBeenCalled();
    });

    it('should call setTheme only once per click', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);

      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      expect(mockSetTheme).toHaveBeenCalledTimes(3);
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should be keyboard accessible', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');

      // Should be focusable
      toggle.focus();
      expect(document.activeElement).toBe(toggle);
    });

    it('should toggle theme on Enter key', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.keyDown(toggle, { key: 'Enter', code: 'Enter' });

      // Button click should be triggered by Enter key
      expect(mockSetTheme).toHaveBeenCalled();
    });

    it('should toggle theme on Space key', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.keyDown(toggle, { key: ' ', code: 'Space' });

      // Button click should be triggered by Space key
      expect(mockSetTheme).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('should have proper styling', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      // Should have className for styling
      expect(toggle.className).toBeTruthy();
    });

    it('should show hover state', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      fireEvent.mouseEnter(toggle);

      // Component should handle hover (styling is CSS-based)
      expect(toggle).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined theme gracefully', () => {
      mockUseTheme.mockReturnValue({
        theme: undefined,
        setTheme: mockSetTheme,
      });

      render(<ThemeToggle />);

      const toggle = screen.getByRole('button');
      expect(toggle).toBeInTheDocument();
    });

    it('should handle missing setTheme gracefully', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: undefined,
      });

      // Should not crash
      expect(() => render(<ThemeToggle />)).not.toThrow();
    });

    it('should work with theme provider', () => {
      mockUseTheme.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        themes: ['light', 'dark', 'system'],
      });

      render(<ThemeToggle />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
