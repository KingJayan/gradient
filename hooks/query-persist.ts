import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarning } from '../utils/error-logger';
import { LOCAL_KEYS } from '../utils/storage';

export interface PersistedEntry {
  data: unknown;
  updatedAt: number;
}

export async function loadPersistedCache(): Promise<Record<string, PersistedEntry>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEYS.queryCache);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    logWarning('Failed to load persisted cache', { error: e instanceof Error ? e.message : String(e) });
    return {};
  }
}

export function persistCache(entries: Record<string, PersistedEntry>) {
  AsyncStorage.setItem(LOCAL_KEYS.queryCache, JSON.stringify(entries)).catch((e) => {
    logWarning('Failed to persist cache', { error: e instanceof Error ? e.message : String(e) });
  });
}

export function clearPersistedCache() {
  AsyncStorage.removeItem(LOCAL_KEYS.queryCache).catch(() => {});
}
