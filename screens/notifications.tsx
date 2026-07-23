import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useNotifications } from '../hooks/use-notifications';
import { AppNotification } from '../services/notifications';
import { FONT, RADIUS, SPACING } from '../utils/tokens';
import { Screen, ScreenHeader, Card, IconButton, EmptyState } from '../components/screen';

function relativeTime(at: number): string {
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

export default function NotificationsScreen() {
  const { currentTheme } = useTheme();
  const { notifications, markAllRead, clearNotifications } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: currentTheme.primary + '22' }]}>
        <Ionicons name="trending-up" size={20} color={currentTheme.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: currentTheme.text }]}>{item.body}</Text>
        <Text style={[styles.time, { color: currentTheme.textSecondary }]}>{relativeTime(item.at)}</Text>
      </View>
    </Card>
  );

  const header = (
    <ScreenHeader
      title="Notifications"
      right={
        notifications.length > 0 ? (
          <IconButton
            name="trash-outline"
            color={currentTheme.textSecondary}
            label="Clear all notifications"
            onPress={clearNotifications}
          />
        ) : undefined
      }
    />
  );

  return (
    <Screen header={header}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications yet"
            message="You'll hear from us when a class average changes."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, padding: SPACING.lg },
  iconWrap: { alignItems: 'center', borderRadius: RADIUS.md, height: 40, justifyContent: 'center', width: 40 },
  list: { padding: SPACING.lg },
  textWrap: { flex: 1 },
  time: { fontSize: FONT.sm, marginTop: SPACING.xxs },
  title: { fontSize: FONT.base, fontWeight: '600' },
});
