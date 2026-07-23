import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Animated,
  Easing,
  TouchableOpacity,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  AccessibilityState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { ELEVATION, FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';

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
  updatedAt,
  right,
}: {
  title: string;
  subtitle?: string;
  updatedAt?: number;
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
        {updatedAt !== undefined ? <Freshness updatedAt={updatedAt} /> : null}
      </View>
      {right}
    </View>
  );
}

function relativeAge(updatedAt: number, now: number): string {
  if (!updatedAt) return '';
  const mins = Math.floor((now - updatedAt) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
}

export function Freshness({ updatedAt, style }: { updatedAt: number; style?: StyleProp<TextStyle> }) {
  const { currentTheme } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const label = relativeAge(updatedAt, now);
  if (!label) return null;
  return <Text style={[styles.freshness, { color: currentTheme.textSecondary }, style]}>{label}</Text>;
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

export function Card({
  onPress,
  style,
  children,
  ...a11y
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}) {
  const { currentTheme, scheme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: currentTheme.surface,
    borderColor: currentTheme.border,
    shadowColor: UI_COLORS.black,
  };

  if (!onPress) {
    return (
      <View style={[styles.card, base, { shadowOpacity: ELEVATION.opacity[scheme] }, style]} {...a11y}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        base,
        {
          shadowOpacity: pressed ? ELEVATION.pressedOpacity[scheme] : ELEVATION.opacity[scheme],
          transform: [{ scale: pressed ? ELEVATION.pressedScale : 1 }],
        },
        style,
      ]}
      {...a11y}
    >
      {children}
    </Pressable>
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
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: ELEVATION.android,
    shadowOffset: ELEVATION.offset,
    shadowRadius: ELEVATION.radius,
  },
  center: { alignItems: 'center', flex: 1, gap: SPACING.lg, justifyContent: 'center' },
  errorText: { fontSize: FONT.base, paddingHorizontal: SPACING.xxxl, textAlign: 'center' },
  freshness: { fontSize: FONT.sm, marginTop: SPACING.xs },
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
