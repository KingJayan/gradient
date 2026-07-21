import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthContext, AuthContextType, Student } from '../context/auth-context';
import type { useDataCache } from '../context/data-context';
import { ThemeContext, ThemeContextType, THEMES } from '../context/theme-context';

export const TEST_USER: Student = {
  id: '1',
  username: 'student',
  hacUrl: 'https://hac.example.org',
  name: 'Test Student',
};

const theme: ThemeContextType = {
  currentTheme: THEMES.emerald,
  themeName: 'emerald',
  availableThemes: Object.keys(THEMES),
  setTheme: jest.fn(async () => {}),
};

export const auth: AuthContextType = {
  state: { isLoggedOut: false, userToken: 'authenticated', user: TEST_USER },
  bootstrapAsync: jest.fn(async () => {}),
  login: jest.fn(async () => {}),
  logout: jest.fn(async () => {}),
};

export function renderScreen(ui: React.ReactElement) {
  return render(
    <ThemeContext.Provider value={theme}>
      <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

export const navigation = { navigate: jest.fn() } as never;

type DataContextValue = ReturnType<typeof useDataCache>;
type Cache = DataContextValue['cache'];

export function dataContext(cache: Partial<Cache> = {}) {
  const value: Cache = {
    grades: null,
    courses: null,
    assignments: null,
    schedule: null,
    loading: false,
    error: null,
    ...cache,
  };
  return {
    cache: value,
    loadGradesAndCourses: jest.fn(async () => {}),
    clearCache: jest.fn(),
  };
}
