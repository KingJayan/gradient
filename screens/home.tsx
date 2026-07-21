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
import { UI_COLORS } from '../utils/colors';
import { Screen, AsyncContent } from '../components/screen';

export default function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<Record<string, undefined>> }) {
  const authContext = useContext(AuthContext);
  const { currentTheme } = useTheme();
  const { cache, clearCache, loadGradesAndCourses } = useDataCache();
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
  };

  if (!authContext) return null;
  const { state } = authContext;

  return (
    <Screen>
      <AsyncContent loading={cache.loading} hasData={cache.grades != null}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
        }
      >
        <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
          <View>
            <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>{currentDate}</Text>
            <Text style={[styles.name, { color: currentTheme.text }]} accessibilityRole="header">{state.user?.name || 'Welcome'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: currentTheme.primary + '20' }]}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Ionicons name="person-circle" size={48} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View
            style={[styles.statCard, { backgroundColor: currentTheme.surface }]}
            accessible
            accessibilityLabel={`Weighted GPA ${gpaResult ? gpaResult.weighted : 'unavailable'}`}
          >
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Weighted GPA</Text>
              <Ionicons name="trending-up" size={18} color={currentTheme.textSecondary} />
            </View>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{gpa}</Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: currentTheme.surface }]}
            accessible
            accessibilityLabel={`${classes} active classes`}
          >
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Active Classes</Text>
              <Ionicons name="school" size={18} color={currentTheme.textSecondary} />
            </View>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{classes}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.transcriptCard, { backgroundColor: currentTheme.surface }]}
            onPress={() => navigation.navigate('Transcript')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View transcript"
          >
            <View style={[styles.transcriptIcon, { backgroundColor: currentTheme.primary + '22' }]}>
              <Ionicons name="document" size={24} color={currentTheme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.transcriptTitle, { color: currentTheme.text }]}>Transcript</Text>
              <Text style={[styles.transcriptSubtitle, { color: currentTheme.textSecondary }]}>View your full academic record</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateText: { fontSize: 13, letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  flex1: { flex: 1 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  name: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  profileButton: { borderRadius: 24, padding: 8 },
  scrollView: { flex: 1 },
  section: { marginBottom: 16, paddingHorizontal: 20 },
  spacer: { height: 40 },
  statCard: {
    borderRadius: 12,
    elevation: 3,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: UI_COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  statTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statValue: { fontSize: 32, fontWeight: '800' },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 28, paddingHorizontal: 20 },
  transcriptCard: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  transcriptIcon: { alignItems: 'center', borderRadius: 10, height: 44, justifyContent: 'center', width: 44 },
  transcriptSubtitle: { fontSize: 12, marginTop: 2 },
  transcriptTitle: { fontSize: 15, fontWeight: '600' },
});
