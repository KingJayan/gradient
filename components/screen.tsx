import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS, onPrimary } from '../utils/colors';

export function Screen({
  header,
  style,
  children,
}: {
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const { currentTheme } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: currentTheme.background }, style]}>
      {header}
      {children}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { currentTheme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function RetryButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { currentTheme } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.retryButton, { backgroundColor: currentTheme.primary }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Retry"
    >
      <Text style={[styles.retryButtonText, { color: onPrimary(currentTheme.primary) }]}>Retry</Text>
    </TouchableOpacity>
  );
}

export function AsyncContent({
  loading,
  error,
  onRetry,
  isEmpty,
  empty,
  children,
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { currentTheme } = useTheme();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={UI_COLORS.danger} />
        <Text style={[styles.errorText, { color: currentTheme.text }]}>{error}</Text>
        {onRetry ? <RetryButton onPress={onRetry} /> : null}
      </View>
    );
  }

  if (isEmpty && empty !== undefined) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  errorText: { fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerSubtitle: { fontSize: 14, marginTop: 6 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { fontSize: 12, fontWeight: '600' },
  screen: { flex: 1 },
});
