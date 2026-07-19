import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarning } from '../utils/error-logger';

const CACHE_KEY = 'hacQueryCache';

export interface PersistedEntry {
  data: unknown;
  updatedAt: number;
}

export async function loadPersistedCache(): Promise<Record<string, PersistedEntry>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    logWarning('Failed to load persisted cache', { error: e instanceof Error ? e.message : String(e) });
    return {};
  }
}

export function persistCache(entries: Record<string, PersistedEntry>) {
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries)).catch((e) => {
    logWarning('Failed to persist cache', { error: e instanceof Error ? e.message : String(e) });
  });
}

export function clearPersistedCache() {
  AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}
