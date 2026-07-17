/* eslint-disable react-native/no-color-literals */
// white text on colored badges + border colors intentionally hardcoded for consistency
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClassPeriod, getScheduleForDay, getCurrentPeriod, getNextPeriod } from '../utils/schedule-data';
import { useCreds } from '../hooks/use-creds';
import { useTheme } from '../hooks/use-theme';
import { fetchSchedule } from '../services/hac-api';

export default function ScheduleScreen() {
  const creds = useCreds();
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullSchedule, setFullSchedule] = useState<ClassPeriod[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadSchedule();
  }, [creds]);

  // tick every minute for current-period tracking
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedule = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setFullSchedule(await fetchSchedule(creds.hacUrl, creds.username, creds.password));
    } catch (e) {
      console.error('schedule load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const schedule = getScheduleForDay(fullSchedule, 'A');
  const currentPeriod = getCurrentPeriod(schedule, currentTime);
  const nextPeriod = getNextPeriod(schedule, currentTime);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
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
      {currentPeriod && (
        <View style={[styles.currentPeriodCard, { backgroundColor: currentTheme.primary }]}>
          <View style={styles.currentPeriodHeader}>
            <Ionicons name="time" size={20} color="#fff" />
            <Text style={styles.currentPeriodTitle}>Now</Text>
          </View>
          <Text style={styles.currentPeriodClass}>{currentPeriod.name}</Text>
          <Text style={styles.currentPeriodRoom}>Room {currentPeriod.room}</Text>
          <Text style={styles.currentPeriodTime}>{currentPeriod.startTime} - {currentPeriod.endTime}</Text>
        </View>
      )}

      {nextPeriod && (
        <View style={[styles.nextPeriodCard, { backgroundColor: currentTheme.surface, borderLeftColor: currentTheme.primary }]}>
          <View style={styles.nextPeriodHeader}>
            <Ionicons name="arrow-forward" size={16} color={currentTheme.textSecondary} />
            <Text style={[styles.nextPeriodTitle, { color: currentTheme.textSecondary }]}>Next</Text>
          </View>
          <Text style={[styles.nextPeriodClass, { color: currentTheme.text }]}>{nextPeriod.name}</Text>
          <Text style={[styles.nextPeriodTime, { color: currentTheme.textSecondary }]}>{nextPeriod.startTime} - {nextPeriod.endTime}</Text>
        </View>
      )}

      <View style={styles.scheduleContainer}>
        <Text style={[styles.scheduleTitle, { color: currentTheme.text }]}>Day Schedule</Text>
        {schedule.length === 0 && (
          <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No schedule data available.</Text>
        )}
        {schedule.map((period) => (
          <View key={period.id} style={[styles.periodCard, { backgroundColor: currentTheme.surface, borderRightColor: currentTheme.border }]}>
            <View style={styles.periodTime}>
              <Text style={[styles.periodTimeText, { color: currentTheme.text }]}>{period.startTime}</Text>
              <Text style={[styles.periodDurationText, { color: currentTheme.textSecondary }]}>{period.endTime}</Text>
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
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { flex: 1 },
  currentPeriodCard: { borderRadius: 12, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 16 },
  currentPeriodClass: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  currentPeriodHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  currentPeriodRoom: { color: '#fff', fontSize: 14, marginBottom: 8, opacity: 0.9 },
  currentPeriodTime: { color: '#fff', fontSize: 12, opacity: 0.8 },
  currentPeriodTitle: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  dayButton: { alignItems: 'center', borderColor: '#ccc', borderRadius: 6, borderWidth: 1, flex: 1, paddingVertical: 8 },
  dayButtonActive: { borderColor: 'transparent' },
  dayButtonText: { color: '#666', fontSize: 14, fontWeight: '600' },
  dayButtonTextActive: { color: '#fff' },
  dayToggle: { borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  emptyText: { marginTop: 20, textAlign: 'center' },
  nextPeriodCard: { borderLeftWidth: 3, borderRadius: 8, marginBottom: 16, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12 },
  nextPeriodClass: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  nextPeriodHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 6 },
  nextPeriodTime: { fontSize: 12 },
  nextPeriodTitle: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  periodCard: { borderRadius: 8, flexDirection: 'row', marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12 },
  periodDurationText: { fontSize: 10, marginTop: 2 },
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
