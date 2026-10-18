'use client';

/**
 * Theme Provider Component
 *
 * Provides dark mode support using next-themes.
 * Features:
 * - System preference detection
 * - Manual theme toggle
 * - Persisted theme selection
 */

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from 'next-themes';

type ThemeProviderProps = NextThemesProviderProps;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
