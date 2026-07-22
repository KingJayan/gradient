import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { logWarning } from '../utils/error-logger';
import { SECURE_KEYS } from '../utils/storage';
import THEME_DATA from '../assets/themes.json';

export interface Theme {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export type Scheme = 'light' | 'dark';
export type Appearance = 'system' | Scheme;

export const THEMES: Record<string, Record<Scheme, Theme>> = THEME_DATA;

const THEME_NAMES = Object.keys(THEMES) as readonly string[];
const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

function isAppearance(value: string): value is Appearance {
  return (APPEARANCES as readonly string[]).includes(value);
}

export interface ThemeContextType {
  currentTheme: Theme;
  themeName: string;
  availableThemes: readonly string[];
  setTheme: (name: string) => Promise<void>;
  appearance: Appearance;
  availableAppearances: readonly Appearance[];
  setAppearance: (value: Appearance) => Promise<void>;
  scheme: Scheme;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState('emerald');
  const [appearance, setAppearanceState] = useState<Appearance>('system');
  const [loading, setLoading] = useState(true);
  const systemScheme = useColorScheme();

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.theme),
      SecureStore.getItemAsync(SECURE_KEYS.appearance),
    ])
      .then(([savedTheme, savedAppearance]) => {
        if (savedTheme && THEMES[savedTheme]) setThemeName(savedTheme);
        if (savedAppearance && isAppearance(savedAppearance)) setAppearanceState(savedAppearance);
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
      await SecureStore.setItemAsync(SECURE_KEYS.theme, name);
    } catch (e) {
      logWarning('theme persist failed', { themeName: name, error: (e as Error).message });
    }
  }, []);

  const setAppearance = useCallback(async (value: Appearance) => {
    setAppearanceState(value);
    try {
      await SecureStore.setItemAsync(SECURE_KEYS.appearance, value);
    } catch (e) {
      logWarning('appearance persist failed', { appearance: value, error: (e as Error).message });
    }
  }, []);

  const value: ThemeContextType = useMemo(() => {
    const scheme: Scheme = appearance === 'system' ? systemScheme ?? 'dark' : appearance;
    return {
      currentTheme: (THEMES[themeName] ?? THEMES.emerald)[scheme],
      themeName,
      availableThemes: THEME_NAMES,
      setTheme,
      appearance,
      availableAppearances: APPEARANCES,
      setAppearance,
      scheme,
    };
  }, [themeName, setTheme, appearance, setAppearance, systemScheme]);

  if (loading) return null;

  return React.createElement(ThemeContext.Provider, { value }, children);
}
