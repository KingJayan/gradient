import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeProvider } from '../theme-context';
import { useTheme } from '../../hooks/use-theme';
import { SECURE_KEYS } from '../../utils/storage';

jest.mock('react-native/Libraries/Utilities/useColorScheme');

const mockedColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

function Probe() {
  const { scheme, themeName, currentTheme, setAppearance } = useTheme();
  return (
    <Text onPress={() => setAppearance('light')}>
      {`${themeName}:${scheme}:${currentTheme.background}`}
    </Text>
  );
}

async function renderProbe() {
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
  await waitFor(() => expect(screen.getByText(/:/)).toBeTruthy());
}

beforeEach(async () => {
  await SecureStore.deleteItemAsync(SECURE_KEYS.theme);
  await SecureStore.deleteItemAsync(SECURE_KEYS.appearance);
  mockedColorScheme.mockReturnValue('dark');
});

describe('ThemeProvider', () => {
  it('follows the system scheme by default', async () => {
    mockedColorScheme.mockReturnValue('light');
    await renderProbe();
    expect(screen.getByText(/emerald:light:/)).toBeTruthy();
  });

  it('lets an explicit appearance override the system scheme', async () => {
    await renderProbe();
    expect(screen.getByText(/emerald:dark:/)).toBeTruthy();

    await act(async () => {
      screen.getByText(/emerald:dark:/).props.onPress();
    });

    expect(screen.getByText(/emerald:light:/)).toBeTruthy();
    expect(await SecureStore.getItemAsync(SECURE_KEYS.appearance)).toBe('light');
  });

  it('restores a persisted theme and appearance', async () => {
    await SecureStore.setItemAsync(SECURE_KEYS.theme, 'ocean');
    await SecureStore.setItemAsync(SECURE_KEYS.appearance, 'light');
    await renderProbe();
    expect(screen.getByText(/ocean:light:/)).toBeTruthy();
  });

  it('falls back to emerald when the persisted values are unknown', async () => {
    await SecureStore.setItemAsync(SECURE_KEYS.theme, 'chartreuse');
    await SecureStore.setItemAsync(SECURE_KEYS.appearance, 'sepia');
    await renderProbe();
    expect(screen.getByText(/emerald:dark:/)).toBeTruthy();
  });
});
