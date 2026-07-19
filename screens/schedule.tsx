import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClassPeriod } from '../utils/schedule-data';
import { useCreds } from '../hooks/use-creds';
import { useTheme } from '../hooks/use-theme';
import { fetchSchedule } from '../services/hac-api';
import { logError } from '../utils/error-logger';

export default function ScheduleScreen() {
  const creds = useCreds();
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullSchedule, setFullSchedule] = useState<ClassPeriod[]>([]);

  useEffect(() => {
    loadSchedule();
  }, [creds]);

  const loadSchedule = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      setFullSchedule(await fetchSchedule(creds.hacUrl, creds.username, creds.password));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load schedule';
      logError(e instanceof Error ? e : new Error(String(e)), { action: 'loadSchedule' });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const schedule = fullSchedule;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorText, { color: currentTheme.text }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary }]} onPress={loadSchedule}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
      }
    >
      <View style={styles.scheduleContainer}>
        <Text style={[styles.scheduleTitle, { color: currentTheme.text }]}>Your Schedule</Text>
        {schedule.length === 0 && (
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No schedule data available.</Text>
        )}
        {schedule.map((period: ClassPeriod) => (
          <View key={period.id} style={[styles.periodCard, { backgroundColor: currentTheme.surface, borderRightColor: currentTheme.border }]}>
            <View style={styles.periodTime}>
              <Text style={[styles.periodTimeText, { color: currentTheme.text }]}>P{period.id}</Text>
            </View>
            <View style={styles.periodInfo}>
              <Text style={[styles.periodName, { color: currentTheme.text }]}>{period.name}</Text>
              <View style={styles.periodMeta}>
                {period.teacher && (
                  <>
                    <Ionicons name="person" size={14} color={currentTheme.textSecondary} />
                    <Text style={[styles.periodTeacher, { color: currentTheme.textSecondary }]}>{period.teacher}</Text>
                  </>
                )}
                {period.room && (
                  <>
                    <Ionicons name="location" size={14} color={currentTheme.textSecondary} />
                    <Text style={[styles.periodRoom, { color: currentTheme.textSecondary }]}>Room {period.room}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  errorText: { fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  container: { flex: 1 },
  emptyText: { marginTop: 20, textAlign: 'center' },
  periodCard: { borderRadius: 8, flexDirection: 'row', marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12 },
  periodInfo: { flex: 1, marginLeft: 12 },
  periodMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  periodName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  periodRoom: { fontSize: 12 },
  periodTeacher: { fontSize: 12, marginRight: 8 },
  periodTime: { alignItems: 'center', borderRightWidth: 1, justifyContent: 'center', paddingRight: 12, width: 50 },
  periodTimeText: { fontSize: 14, fontWeight: '700' },
  scheduleContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  scheduleTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
});
