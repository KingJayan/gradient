import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/auth-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { calculateGPA } from '../utils/gpa-calculator';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { Screen, AsyncContent, Card, Freshness } from '../components/screen';
import { useNotifications } from '../hooks/use-notifications';
import { UI_COLORS, onPrimary } from '../utils/colors';
import { refreshCompleteHaptic } from '../utils/haptics';

const LINK_CARDS: {
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
}[] = [
  {
    route: 'Schedule',
    icon: 'calendar',
    label: 'View schedule',
    subtitle: 'Your periods, teachers, and bell times',
  },
  {
    route: 'Transcript',
    icon: 'document',
    label: 'View transcript',
    subtitle: 'Your full academic record',
  },
];

export default function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<Record<string, undefined>> }) {
  const authContext = useContext(AuthContext);
  const { currentTheme } = useTheme();
  const { cache, clearCache, loadGradesAndCourses } = useDataCache();
  const { unread } = useNotifications();
  const gpaResult = useMemo(
    () => (cache.courses && cache.courses.length > 0 ? calculateGPA(cache.courses) : null),
    [cache.courses]
  );
  const gpa = gpaResult ? String(gpaResult.weighted) : '—';
  const classes = gpaResult?.courseCount ?? 0;
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const now = new Date();
    setCurrentDate(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now)
    );

    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    clearCache();
    await loadGradesAndCourses();
    setRefreshing(false);
    refreshCompleteHaptic();
  };

  if (!authContext) return null;
  const { state } = authContext;

  return (
    <Screen>
      <AsyncContent loading={cache.loading} error={cache.error} onRetry={onRefresh} hasData={cache.grades != null}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
        }
      >
        <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
          <View>
            <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>{currentDate}</Text>
            <Text style={[styles.name, { color: currentTheme.text }]} accessibilityRole="header">{state.user?.name || 'Welcome'}</Text>
            <Freshness updatedAt={cache.updatedAt} />
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.bellButton, { backgroundColor: currentTheme.primary + '20' }]}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            >
              <Ionicons name="notifications" size={24} color={currentTheme.primary} />
              {unread > 0 && (
                <View style={[styles.badge, { backgroundColor: UI_COLORS.danger }]}>
                  <Text style={[styles.badgeText, { color: onPrimary(UI_COLORS.danger) }]} maxFontSizeMultiplier={1.2}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: currentTheme.primary + '20' }]}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Ionicons name="person-circle" size={48} color={currentTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Card
            style={styles.statCard}
            accessible
            accessibilityLabel={`Weighted GPA ${gpaResult ? gpaResult.weighted : 'unavailable'}`}
          >
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Weighted GPA</Text>
              <Ionicons name="trending-up" size={18} color={currentTheme.textSecondary} />
            </View>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{gpa}</Text>
          </Card>
          <Card
            style={styles.statCard}
            accessible
            accessibilityLabel={`${classes} active classes`}
          >
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Active Classes</Text>
              <Ionicons name="school" size={18} color={currentTheme.textSecondary} />
            </View>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{classes}</Text>
          </Card>
        </View>

        <View style={styles.section}>
          {LINK_CARDS.map((card) => (
            <Card
              key={card.route}
              style={styles.linkCard}
              onPress={() => navigation.navigate(card.route)}
              accessibilityRole="button"
              accessibilityLabel={card.label}
            >
              <View style={[styles.linkIcon, { backgroundColor: currentTheme.primary + '22' }]}>
                <Ionicons name={card.icon} size={24} color={currentTheme.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.linkTitle, { color: currentTheme.text }]}>{card.route}</Text>
                <Text style={[styles.linkSubtitle, { color: currentTheme.textSecondary }]}>{card.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
            </Card>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: SPACING.xs,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  badgeText: { fontSize: FONT.xs, fontWeight: '700' },
  bellButton: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: TOUCH_TARGET,
    justifyContent: 'center',
    width: TOUCH_TARGET,
  },
  dateText: { fontSize: FONT.md, letterSpacing: 0.5, marginBottom: SPACING.xxs, textTransform: 'uppercase' },
  flex1: { flex: 1 },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: SPACING.sm },
  linkCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  linkIcon: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: TOUCH_TARGET,
    justifyContent: 'center',
    width: TOUCH_TARGET,
  },
  linkSubtitle: { fontSize: FONT.sm, marginTop: SPACING.xxs },
  linkTitle: { fontSize: FONT.lg, fontWeight: '600' },
  name: { fontSize: FONT.display, fontWeight: '700', marginTop: SPACING.xs },
  profileButton: { borderRadius: RADIUS.pill, padding: SPACING.sm },
  scrollView: { flex: 1 },
  section: { marginBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  spacer: { height: 40 },
  statCard: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  statLabel: { fontSize: FONT.sm, fontWeight: '600', letterSpacing: 0.3 },
  statTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  statValue: { fontSize: FONT.hero, fontWeight: '800' },
  statsContainer: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xxl, paddingHorizontal: SPACING.lg },
});
