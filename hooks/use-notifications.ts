import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  AppNotification,
  loadNotifications,
  subscribeNotifications,
  unreadCount,
  markAllRead,
  clearNotifications,
} from '../services/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let active = true;
    loadNotifications().then((list) => {
      if (active) setNotifications(list);
    });
    const unsubscribe = subscribeNotifications(setNotifications);
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') loadNotifications().then(setNotifications);
    });
    return () => {
      active = false;
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return {
    notifications,
    unread: unreadCount(notifications),
    markAllRead,
    clearNotifications,
  };
}
