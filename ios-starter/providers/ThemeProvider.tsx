/**
 * Theme Context Provider
 * Feature: IOS-THEME-001
 *
 * Provides theme management throughout the app:
 * - Dark/Light/System theme modes
 * - System preference detection
 * - Manual theme toggling
 * - Theme persistence with AsyncStorage
 *
 * @module providers/ThemeProvider
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Available theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme context value shape
 */
interface ThemeContextValue {
  /**
   * Current theme setting (light/dark/system)
   */
  theme: Theme;

  /**
   * Actual color scheme being used (resolves system to light/dark)
   */
  colorScheme: 'light' | 'dark';

  /**
   * Convenience boolean - true if using dark mode
   */
  isDark: boolean;

  /**
   * Manually set theme
   */
  setTheme: (theme: Theme) => void;

  /**
   * Toggle between light and dark (ignores system)
   */
  toggleTheme: () => void;
}

/**
 * Theme Context
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * AsyncStorage key for theme preference
 */
const THEME_STORAGE_KEY = 'theme';

/**
 * Theme Provider Component
 *
 * Manages theme state and provides theme values to the app.
 * Automatically detects system theme preference and listens for changes.
 * Persists user's theme selection to AsyncStorage.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  /**
   * Load saved theme preference from storage on mount
   */
  useEffect(() => {
    loadTheme();
  }, []);

  /**
   * Listen for system theme changes
   */
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  /**
   * Load theme preference from AsyncStorage
   */
  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setThemeState(savedTheme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme from storage:', error);
    }
  };

  /**
   * Set theme and persist to storage
   */
  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
  };

  /**
   * Toggle between light and dark mode
   * If currently on system, defaults to dark
   */
  const toggleTheme = () => {
    const currentScheme = resolveColorScheme();
    const newTheme = currentScheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  /**
   * Resolve the actual color scheme being used
   * Maps 'system' to the actual system preference
   */
  const resolveColorScheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return theme;
  };

  const colorScheme = resolveColorScheme();
  const isDark = colorScheme === 'dark';

  const value: ThemeContextValue = {
    theme,
    colorScheme,
    isDark,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 *
 * @throws {Error} If used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isDark, toggleTheme } = useTheme();
 *
 *   return (
 *     <View style={{ backgroundColor: isDark ? '#000' : '#fff' }}>
 *       <Button onPress={toggleTheme} title="Toggle Theme" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
