import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const SECURE_KEYS = {
  token: 'userToken',
  user: 'user',
  password: 'userPass',
  appLock: 'appLockEnabled',
  theme: 'appTheme',
  appearance: 'appAppearance',
} as const;

export const LOCAL_KEYS = {
  queryCache: 'hacQueryCache',
  personalTasks: 'personalTasks',
  bellSchedule: 'bellSchedule',
} as const;

export async function wipeLocalData(): Promise<void> {
  await Promise.all<unknown>([
    ...Object.values(SECURE_KEYS).map((key) => SecureStore.deleteItemAsync(key)),
    AsyncStorage.multiRemove(Object.values(LOCAL_KEYS)),
  ]);
}
