import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Animated,
  Easing,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/auth-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { calculateGPA } from '../utils/gpa-calculator';

interface NavCard {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  description: string;
  route?: string;
}

export default function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<Record<string, undefined>> }) {
  const authContext = useContext(AuthContext);
  const { currentTheme } = useTheme();
  const { cache, loadGradesAndCourses } = useDataCache();
  const [gpa, setGpa] = useState('—');
  const [classes, setClasses] = useState(0);
  const [currentDate, setCurrentDate] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadGradesAndCourses();
    }, [loadGradesAndCourses])
  );

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

  useEffect(() => {
    if (cache.courses && cache.courses.length > 0) {
      const result = calculateGPA(cache.courses);
      setGpa(String(result.weighted));
      setClasses(result.courseCount);
    }
  }, [cache.courses]);

  const navCards: NavCard[] = [
    { id: 'schedule', title: 'Schedule', icon: 'calendar', color: '#3B82F6', description: 'View your class schedule', route: 'Schedule' },
    { id: 'grades', title: 'Grades', icon: 'document-text', color: currentTheme.primary, description: 'View all your grades', route: 'Grades' },
    { id: 'gpa', title: 'GPA Calculator', icon: 'calculator', color: '#8B5CF6', description: 'Calculate and predict GPA', route: 'GPA' },
    { id: 'planner', title: 'Planner', icon: 'checkbox', color: '#F59E0B', description: 'Manage tasks and assignments', route: 'Planner' },
    { id: 'transcript', title: 'Transcript', icon: 'document', color: '#EC4899', description: 'View your transcript', route: 'Transcript' },
  ];

  const renderNavCard = ({ item }: { item: NavCard }) => {
    const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });
    return (
      <Animated.View style={[styles.cardWrapper, { transform: [{ translateX }], opacity: slideAnim }]}>
        <TouchableOpacity
          style={[styles.navCard, { backgroundColor: item.color }]}
          onPress={() => item.route && navigation.navigate(item.route)}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconContainer}>
            <Ionicons name={item.icon} size={32} color="#fff" />
          </View>
          <Text style={styles.navCardTitle}>{item.title}</Text>
          <Text style={styles.navCardDescription}>{item.description}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!authContext) return null;
  const { state } = authContext;

  if (cache.loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
          <View>
            <Text style={[styles.dateText, { color: currentTheme.textSecondary }]}>{currentDate}</Text>
            <Text style={[styles.name, { color: currentTheme.text }]}>{state.user?.name || 'Welcome'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: currentTheme.primary + '20' }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="person-circle" size={48} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: currentTheme.primary, shadowColor: currentTheme.primary }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>Weighted GPA</Text>
              <Ionicons name="trending-up" size={18} color="#fff" />
            </View>
            <Text style={styles.statValue}>{gpa}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
            <View style={styles.statTop}>
              <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>Active Classes</Text>
              <Ionicons name="school" size={18} color="#fff" />
            </View>
            <Text style={styles.statValue}>{classes}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Quick Access</Text>
          <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>Navigate to key features</Text>
        </View>

        <View style={styles.cardsGrid}>
          <FlatList
            data={navCards}
            renderItem={renderNavCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
          />
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardIconContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
  cardWrapper: { flex: 1, maxWidth: '48%' },
  cardsGrid: { marginBottom: 24, paddingHorizontal: 20 },
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  columnWrapper: { gap: 12, justifyContent: 'space-between', marginBottom: 12 },
  container: { flex: 1 },
  dateText: { fontSize: 13, letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  gridContent: { paddingHorizontal: 0 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  name: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  navCard: {
    alignItems: 'center',
    borderRadius: 16,
    elevation: 3,
    justifyContent: 'center',
    minHeight: 160,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  navCardDescription: { color: 'rgba(255,255,255,0.85)', fontSize: 11, textAlign: 'center' },
  navCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  profileButton: { borderRadius: 24, padding: 8 },
  scrollView: { flex: 1 },
  section: { marginBottom: 16, paddingHorizontal: 20 },
  sectionSubtitle: { fontSize: 13 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  spacer: { height: 40 },
  statCard: {
    borderRadius: 16,
    elevation: 3,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  statTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 28, paddingHorizontal: 20 },
});
