import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  AccessibilityState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { ELEVATION, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { selectionHaptic } from '../utils/haptics';
import { Text } from './typography';

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
        <Text variant="title" color={currentTheme.text} accessibilityRole="header">{title}</Text>
        {subtitle ? (
          <Text variant="subhead" color={currentTheme.textSecondary} style={styles.headerSubtitle}>{subtitle}</Text>
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
  return <Text variant="caption" color={currentTheme.textSecondary} style={[styles.freshness, style]}>{label}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  color,
  icon,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'outline';
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { currentTheme } = useTheme();
  const fill = variant === 'primary' ? currentTheme.primary : variant === 'danger' ? UI_COLORS.danger : 'transparent';
  const fg =
    variant === 'outline'
      ? color ?? currentTheme.text
      : variant === 'danger'
        ? UI_COLORS.white
        : onPrimary(currentTheme.primary);
  const inactive = disabled || loading;

  const handlePress = () => {
    if (inactive) return;
    selectionHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: fill, borderColor: variant === 'outline' ? color ?? currentTheme.border : 'transparent', borderWidth: variant === 'outline' ? 1 : 0 },
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text variant="body" weight="600" color={fg}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function RetryButton({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return <Button title="Retry" onPress={onPress} style={style} />;
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={state}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function StatBadge({
  label,
  background,
  color,
  onPress,
  state,
  style,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  background: string;
  color?: string;
  onPress?: () => void;
  state?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const fg = color ?? onPrimary(background);
  const content = (
    <Text variant="caption" weight="700" color={fg}>{label}</Text>
  );

  if (!onPress) {
    return (
      <View style={[styles.badge, { backgroundColor: background }, style]} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  const handlePress = () => {
    selectionHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.badge, { backgroundColor: background }, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={state}
    >
      {content}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  color,
  trackColor,
  style,
}: {
  value: number;
  color: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { currentTheme } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      style={[styles.progressTrack, { backgroundColor: trackColor ?? currentTheme.border }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Card({
  onPress,
  haptic,
  style,
  children,
  ...a11y
}: {
  onPress?: () => void;
  haptic?: boolean;
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

  const handlePress = () => {
    if (haptic) selectionHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
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

export function ListRow({
  title,
  subtitle,
  titleColor,
  leadingIcon,
  leadingColor,
  trailing,
  onPress,
  style,
  accessibilityRole,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  titleColor?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  leadingColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}) {
  const { currentTheme } = useTheme();
  return (
    <Card
      style={[styles.listRow, style]}
      onPress={onPress}
      haptic={!!onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {leadingIcon ? <Ionicons name={leadingIcon} size={22} color={leadingColor ?? currentTheme.primary} /> : null}
      <View style={styles.listRowText}>
        <Text variant="body" weight="600" color={titleColor ?? currentTheme.text}>{title}</Text>
        {subtitle ? <Text variant="subhead" color={currentTheme.textSecondary} style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { currentTheme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: currentTheme.primary + '18' }]}>
        <Ionicons name={icon} size={40} color={currentTheme.primary} />
      </View>
      <Text variant="heading" color={currentTheme.text} style={styles.centerText} accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color={currentTheme.textSecondary} style={styles.emptyMessage}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
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
          <Text variant="body" color={currentTheme.text} style={styles.errorText}>{error}</Text>
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
  badge: {
    alignItems: 'center',
    borderRadius: RADIUS.xs,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  button: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.xxl,
  },
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: ELEVATION.android,
    shadowOffset: ELEVATION.offset,
    shadowRadius: ELEVATION.radius,
  },
  center: { alignItems: 'center', flex: 1, gap: SPACING.lg, justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  disabled: { opacity: 0.4 },
  emptyAction: { marginTop: SPACING.xl },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 72,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    width: 72,
  },
  emptyMessage: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    textAlign: 'center',
  },
  emptyState: { alignItems: 'center', paddingHorizontal: SPACING.xxl, paddingTop: SPACING.giant },
  errorText: { paddingHorizontal: SPACING.xxxl, textAlign: 'center' },
  freshness: { marginTop: SPACING.xs },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  headerSubtitle: { marginTop: SPACING.sm },
  headerText: { flex: 1 },
  iconButton: { alignItems: 'center', justifyContent: 'center', minHeight: TOUCH_TARGET, minWidth: TOUCH_TARGET },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  listRowSubtitle: { marginTop: SPACING.xxs },
  listRowText: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: ELEVATION.pressedScale }] },
  progressFill: { borderRadius: RADIUS.xs, height: '100%' },
  progressTrack: { borderRadius: RADIUS.xs, height: 8, overflow: 'hidden' },
  screen: { flex: 1 },
  skeletonBlock: { borderRadius: RADIUS.sm },
  skeletonCard: { borderRadius: RADIUS.md, height: 76, marginBottom: SPACING.md },
  skeletonWrap: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
});
