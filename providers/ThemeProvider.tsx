import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  highContrastLightColors,
  highContrastDarkColors,
  spacing,
  borderRadius,
  typography,
  shadows,
  type ColorPalette,
} from '@/constants/design-tokens';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ContrastMode = 'normal' | 'high';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  contrast: ContrastMode;
  colors: ColorPalette;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
}

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  contrastMode: ContrastMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setContrastMode: (mode: ContrastMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  toggleContrast: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_MODE_KEY = '@everreach/theme_mode';
const CONTRAST_MODE_KEY = '@everreach/contrast_mode';

function getColors(isDark: boolean, contrast: ContrastMode): ColorPalette {
  if (contrast === 'high') {
    return isDark ? highContrastDarkColors : highContrastLightColors;
  }
  return isDark ? darkColors : lightColors;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [contrastMode, setContrastModeState] = useState<ContrastMode>('normal');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedContrast] = await Promise.all([
        AsyncStorage.getItem(THEME_MODE_KEY),
        AsyncStorage.getItem(CONTRAST_MODE_KEY),
      ]);

      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto') {
        setThemeModeState(savedTheme);
      }

      if (savedContrast === 'high' || savedContrast === 'normal') {
        setContrastModeState(savedContrast);
      }
    } catch (error) {
      console.error('[ThemeProvider] Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = useMemo(
    () => async (mode: ThemeMode) => {
      try {
        await AsyncStorage.setItem(THEME_MODE_KEY, mode);
        setThemeModeState(mode);
      } catch (error) {
        console.error('[ThemeProvider] Failed to save theme mode:', error);
      }
    },
    []
  );

  const setContrastMode = useMemo(
    () => async (mode: ContrastMode) => {
      try {
        await AsyncStorage.setItem(CONTRAST_MODE_KEY, mode);
        setContrastModeState(mode);
      } catch (error) {
        console.error('[ThemeProvider] Failed to save contrast mode:', error);
      }
    },
    []
  );

  const toggleTheme = useMemo(
    () => async () => {
      const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light';
      await setThemeMode(nextMode);
    },
    [themeMode, setThemeMode]
  );

  const toggleContrast = useMemo(
    () => async () => {
      const nextMode: ContrastMode = contrastMode === 'normal' ? 'high' : 'normal';
      await setContrastMode(nextMode);
    },
    [contrastMode, setContrastMode]
  );

  const isDark = themeMode === 'auto' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = useMemo<Theme>(() => {
    const colors = getColors(isDark, contrastMode);
    return {
      mode: themeMode,
      isDark,
      contrast: contrastMode,
      colors,
      spacing,
      borderRadius,
      typography,
      shadows,
    };
  }, [themeMode, isDark, contrastMode]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      contrastMode,
      setThemeMode,
      setContrastMode,
      toggleTheme,
      toggleContrast,
    }),
    [theme, themeMode, contrastMode, setThemeMode, setContrastMode, toggleTheme, toggleContrast]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
