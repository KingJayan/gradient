import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { logWarning } from '../utils/error-logger';
import { SECURE_KEYS } from '../utils/storage';

interface AppLockValue {
  enabled: boolean;
  locked: boolean;
  authenticate: () => Promise<boolean>;
  setEnabled: (value: boolean) => Promise<void>;
  isSupported: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockValue | null>(null);

export function AppLockProvider({ isLoggedIn, children }: { isLoggedIn: boolean; children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync(SECURE_KEYS.appLock).then((v) => {
      const on = v === 'true';
      enabledRef.current = on;
      setEnabledState(on);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && enabledRef.current) setUnlocked(false);
    });
    return () => sub.remove();
  }, []);

  const isSupported = useCallback(async () => {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  }, []);

  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Gradient',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) setUnlocked(true);
      return result.success;
    } catch (e) {
      logWarning('Biometric authentication failed', { error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    enabledRef.current = value;
    setEnabledState(value);
    setUnlocked(!value);
    await SecureStore.setItemAsync(SECURE_KEYS.appLock, value ? 'true' : 'false');
  }, []);

  const locked = isLoggedIn && enabled && !unlocked;

  return (
    <AppLockContext.Provider value={{ enabled, locked, authenticate, setEnabled, isSupported }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
