import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DASHBOARD_QUERY_KEY, fetchDashboard } from '../context/data-context';
import { SECURE_KEYS, LOCAL_KEYS } from '../utils/storage';
import { syncGradeNotifications } from './notifications';
import { logWarning } from '../utils/error-logger';

const BACKGROUND_REFRESH_TASK = 'dashboard-refresh';
const REFRESH_INTERVAL_MINUTES = 15;

TaskManager.defineTask(BACKGROUND_REFRESH_TASK, async () => {
  try {
    const [userRaw, password] = await Promise.all([
      SecureStore.getItemAsync(SECURE_KEYS.user),
      SecureStore.getItemAsync(SECURE_KEYS.password),
    ]);
    if (!userRaw || !password) return BackgroundTask.BackgroundTaskResult.Success;

    const user = JSON.parse(userRaw) as { hacUrl: string; username: string; profileId?: string };
    const data = await fetchDashboard({ hacUrl: user.hacUrl, username: user.username, password, profileId: user.profileId });

    const raw = await AsyncStorage.getItem(LOCAL_KEYS.queryCache);
    const cache = raw ? JSON.parse(raw) : {};
    cache[DASHBOARD_QUERY_KEY] = { data, updatedAt: Date.now() };
    await AsyncStorage.setItem(LOCAL_KEYS.queryCache, JSON.stringify(cache));

    await syncGradeNotifications(data.grades);

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    logWarning('Background refresh failed', { error: e instanceof Error ? e.message : String(e) });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_REFRESH_TASK);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_REFRESH_TASK, {
        minimumInterval: REFRESH_INTERVAL_MINUTES,
      });
    }
  } catch (e) {
    logWarning('Background refresh registration failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
