import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Animated,
  Easing,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  AccessibilityState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';

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
        <Text style={[styles.headerTitle, { color: currentTheme.text }]} accessibilityRole="header">{title}</Text>
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

export function IconButton({
  name,
  color,
  label,
  onPress,
  size = 24,
  state,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
  size?: number;
  state?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[styles.iconButton, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={state}
    >
      <Ionicons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { currentTheme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBlock, { backgroundColor: currentTheme.border, opacity }, style]} />;
}

function DefaultSkeleton() {
  return (
    <View style={styles.skeletonWrap} accessible accessibilityRole="progressbar" accessibilityLabel="Loading">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

export function AsyncContent({
  loading,
  error,
  onRetry,
  hasData,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasData?: boolean;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { currentTheme } = useTheme();

  if (!hasData) {
    if (loading) {
      return <>{skeleton ?? <DefaultSkeleton />}</>;
    }
    if (error) {
      return (
        <View style={styles.center} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={48} color={UI_COLORS.danger} />
          <Text style={[styles.errorText, { color: currentTheme.text }]}>{error}</Text>
          {onRetry ? <RetryButton onPress={onRetry} /> : null}
        </View>
      );
    }
  }

  if (isEmpty && empty !== undefined) {
    return <>{empty}</>;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: SPACING.lg, justifyContent: 'center' },
  errorText: { fontSize: FONT.base, paddingHorizontal: SPACING.xxxl, textAlign: 'center' },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  headerSubtitle: { fontSize: FONT.base, marginTop: SPACING.sm },
  headerText: { flex: 1 },
  headerTitle: { fontSize: FONT.display, fontWeight: '700' },
  iconButton: { alignItems: 'center', justifyContent: 'center', minHeight: TOUCH_TARGET, minWidth: TOUCH_TARGET },
  retryButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.xxl,
  },
  retryButtonText: { fontSize: FONT.sm, fontWeight: '600' },
  screen: { flex: 1 },
  skeletonBlock: { borderRadius: RADIUS.sm },
  skeletonCard: { borderRadius: RADIUS.md, height: 76, marginBottom: SPACING.md },
  skeletonWrap: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
});
