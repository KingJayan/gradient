import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { logWarning } from '../utils/error-logger';

export interface Theme {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export const THEMES: Record<string, Theme> = {
  emerald: {
    primary: '#00F5A0',
    background: '#060F0B',
    surface: '#0F1E14',
    text: '#FFFFFF',
    textSecondary: '#6B9E85',
    border: '#1A3326',
  },
  ocean: {
    primary: '#4A9FFF',
    background: '#060B12',
    surface: '#0E1822',
    text: '#FFFFFF',
    textSecondary: '#6B8CAE',
    border: '#152336',
  },
  violet: {
    primary: '#A855F7',
    background: '#08060F',
    surface: '#130E1E',
    text: '#FFFFFF',
    textSecondary: '#8B72AE',
    border: '#1F1230',
  },
  rose: {
    primary: '#F43F5E',
    background: '#0F060A',
    surface: '#1E0E14',
    text: '#FFFFFF',
    textSecondary: '#AE728A',
    border: '#33121C',
  },
  amber: {
    primary: '#FCD34D',
    background: '#0F0C04',
    surface: '#1E1A0A',
    text: '#FFFFFF',
    textSecondary: '#AE9E6B',
    border: '#332E10',
  },
  slate: {
    primary: '#94A3B8',
    background: '#070A0E',
    surface: '#0F1520',
    text: '#FFFFFF',
    textSecondary: '#7A8EAA',
    border: '#1A2336',
  },
};

const THEME_NAMES = Object.keys(THEMES) as readonly string[];

export interface ThemeContextType {
  currentTheme: Theme;
  themeName: string;
  availableThemes: readonly string[];
  setTheme: (name: string) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = 'appTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState('emerald');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((saved) => {
        if (saved && THEMES[saved]) setThemeName(saved);
      })
      .catch((e) => {
        logWarning('theme restore failed', { error: (e as Error).message });
      })
      .finally(() => setLoading(false));
  }, []);

  const setTheme = useCallback(async (name: string) => {
    if (!THEMES[name]) return;
    setThemeName(name);
    try {
      await SecureStore.setItemAsync(THEME_KEY, name);
    } catch (e) {
      logWarning('theme persist failed', { themeName: name, error: (e as Error).message });
    }
  }, []);

  const value: ThemeContextType = useMemo(
    () => ({
      currentTheme: THEMES[themeName] ?? THEMES.emerald,
      themeName,
      availableThemes: THEME_NAMES,
      setTheme,
    }),
    [themeName, setTheme]
  );

  if (loading) return null;

  return React.createElement(ThemeContext.Provider, { value }, children);
}
