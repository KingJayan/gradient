import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_KEYS } from '../utils/storage';
import { recordGradeSnapshot, GradeChange } from '../utils/grade-history';
import { logWarning } from '../utils/error-logger';

export interface NotifPrefs {
  increases: boolean;
  drops: boolean;
  threshold: number;
}

export interface AppNotification {
  id: string;
  at: number;
  title: string;
  body: string;
  read: boolean;
}

export const DEFAULT_PREFS: NotifPrefs = { increases: true, drops: true, threshold: 1 };
const MAX_NOTIFICATIONS = 50;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

let cache: AppNotification[] | null = null;
const listeners = new Set<(list: AppNotification[]) => void>();

function emit(list: AppNotification[]): void {
  cache = list;
  listeners.forEach((l) => l(list));
}

export function subscribeNotifications(cb: (list: AppNotification[]) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function loadNotifications(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(LOCAL_KEYS.notifications);
  cache = raw ? (JSON.parse(raw) as AppNotification[]) : [];
  return cache;
}

async function persist(list: AppNotification[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEYS.notifications, JSON.stringify(list));
  emit(list);
}

export function unreadCount(list: AppNotification[]): number {
  return list.reduce((n, item) => (item.read ? n : n + 1), 0);
}

export async function markAllRead(): Promise<void> {
  const list = cache ?? (await loadNotifications());
  if (!list.some((n) => !n.read)) return;
  await persist(list.map((n) => ({ ...n, read: true })));
}

export async function clearNotifications(): Promise<void> {
  await persist([]);
}

export async function loadPrefs(): Promise<NotifPrefs> {
  const raw = await AsyncStorage.getItem(LOCAL_KEYS.notifPrefs);
  return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : DEFAULT_PREFS;
}

export async function savePrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEYS.notifPrefs, JSON.stringify(prefs));
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (e) {
    logWarning('Notification permission check failed', { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

function selectChanges(changes: GradeChange[], prefs: NotifPrefs): GradeChange[] {
  return changes.filter((c) => {
    if (Math.abs(c.to - c.from) < prefs.threshold) return false;
    return c.to > c.from ? prefs.increases : prefs.drops;
  });
}

export async function syncGradeNotifications(
  grades: { className: string; average: number }[]
): Promise<void> {
  try {
    const changes = await recordGradeSnapshot(grades);
    if (changes.length === 0) return;

    const prefs = await loadPrefs();
    const selected = selectChanges(changes, prefs);
    if (selected.length === 0) return;

    const list = cache ?? (await loadNotifications());
    const created: AppNotification[] = selected.map((c) => ({
      id: `${c.className}:${Date.now()}:${c.to}`,
      at: Date.now(),
      title: 'Grade update',
      body: `Your ${c.className} average changed ${c.from} → ${c.to}`,
      read: false,
    }));

    await persist([...created, ...list].slice(0, MAX_NOTIFICATIONS));

    for (const n of created) {
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body },
        trigger: null,
      }).catch(() => {});
    }
  } catch (e) {
    logWarning('Grade notification sync failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
