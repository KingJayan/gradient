import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { logWarning } from '../utils/error-logger';

export type UpdateResult = 'downloaded' | 'current' | 'unsupported' | 'failed';

export const OTA_ENABLED = Updates.isEnabled;

export function currentUpdateLabel(): string {
  return Updates.updateId ? Updates.updateId.slice(0, 8) : 'Embedded';
}

export async function fetchUpdate(): Promise<UpdateResult> {
  if (!Updates.isEnabled) return 'unsupported';
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return 'current';
    await Updates.fetchUpdateAsync();
    return 'downloaded';
  } catch (e) {
    logWarning('Update check failed', { error: e instanceof Error ? e.message : String(e) });
    return 'failed';
  }
}

export async function applyUpdate(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    logWarning('Update reload failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export function useAutoUpdate() {
  const pending = useRef(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    let active = true;
    const check = () => {
      fetchUpdate().then((result) => {
        if (active) pending.current = result === 'downloaded';
      });
    };

    check();
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (pending.current) applyUpdate();
      else check();
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, []);
}
