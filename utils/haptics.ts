import * as Haptics from 'expo-haptics';

export function refreshCompleteHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
