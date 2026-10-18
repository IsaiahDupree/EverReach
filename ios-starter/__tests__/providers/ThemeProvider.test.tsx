/**
 * Test Suite for ThemeProvider
 * Feature: IOS-THEME-001
 *
 * Tests the theme context provider that manages:
 * - Theme state (light/dark/system)
 * - System preference detection
 * - Manual theme toggling
 * - Theme persistence
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme, ThemeContext } from '../../providers/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock react-native Appearance
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Appearance: {
    getColorScheme: jest.fn(),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    // Default to light mode
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('light');
    (Appearance.addChangeListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Attempt to use hook outside provider
      const { result } = renderHook(() => {
        try {
          return useTheme();
        } catch (error) {
          return { error: (error as Error).message };
        }
      });

      expect(result.current).toHaveProperty('error');
      expect((result.current as any).error).toContain('useTheme must be used within ThemeProvider');
    });

    it('should be defined as a function', () => {
      expect(useTheme).toBeDefined();
      expect(typeof useTheme).toBe('function');
    });
  });

  describe('ThemeProvider Component', () => {
    it('should render without crashing', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toBeDefined();
    });

    it('should provide initial theme state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.colorScheme).toBeDefined();
      expect(result.current.isDark).toBeDefined();
      expect(result.current.setTheme).toBeDefined();
      expect(result.current.toggleTheme).toBeDefined();
    });

    it('should default to system color scheme when no stored preference', async () => {
      (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should load stored theme preference from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('dark');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('theme');
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('Theme Toggling', () => {
    it('should toggle theme from light to dark', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.setTheme).toBeDefined();
      });

      // Set to light first
      await act(async () => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);

      // Toggle to dark
      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should toggle theme from dark to light', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.setTheme).toBeDefined();
      });

      // Set to dark first
      await act(async () => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);

      // Toggle to light
      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should persist theme changes to AsyncStorage', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.setTheme).toBeDefined();
      });

      await act(async () => {
        result.current.setTheme('dark');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('System Theme Detection', () => {
    it('should detect system dark mode', async () => {
      (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      expect(result.current.colorScheme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });

    it('should detect system light mode', async () => {
      (Appearance.getColorScheme as jest.Mock).mockReturnValue('light');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      expect(result.current.colorScheme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });

    it('should listen for system theme changes', async () => {
      let listener: any;
      (Appearance.addChangeListener as jest.Mock).mockImplementation((callback) => {
        listener = callback;
        return { remove: jest.fn() };
      });

      (Appearance.getColorScheme as jest.Mock).mockReturnValue('light');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      });

      expect(Appearance.addChangeListener).toHaveBeenCalled();
      expect(result.current.colorScheme).toBe('light');

      // Simulate system theme change
      (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');
      act(() => {
        listener({ colorScheme: 'dark' });
      });

      expect(result.current.colorScheme).toBe('dark');
    });
  });

  describe('ThemeContext', () => {
    it('should export ThemeContext', () => {
      expect(ThemeContext).toBeDefined();
    });
  });
});
