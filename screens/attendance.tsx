/* eslint-disable react-native/no-color-literals, react-native/no-inline-styles */
// semantic colors (status badges, shadows, overlays) intentionally hardcoded for contrast/consistency
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceRecord, calculateAttendancePercentage } from '../utils/schedule-data';
import { useCreds } from '../hooks/use-creds';
import { useTheme } from '../hooks/use-theme';
import { fetchAttendance } from '../services/hac-api';

export default function AttendanceScreen() {
  const creds = useCreds();
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadAttendance();
  }, [creds]);

  const loadAttendance = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setUnavailable(false);
      const data = await fetchAttendance(creds.hacUrl, creds.username, creds.password);
      if (data.length === 0) {
        setUnavailable(true);
      } else {
        setRecords(data);
      }
    } catch {
      // report-card endpoint may not expose attendance for all districts
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':  return '#00DD88';
      case 'absent':   return '#ff4444';
      case 'tardy':    return '#FFDD00';
      case 'excused':  return '#00DDFF';
      default:         return '#ddd';
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'present':  return 'checkmark-circle';
      case 'absent':   return 'close-circle';
      case 'tardy':    return 'alert-circle';
      case 'excused':  return 'help-circle';
      default:         return 'help-circle';
    }
  };

  const groupedByWeek = records.reduce((acc, record) => {
    const date = new Date(record.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toLocaleDateString();
    (acc[key] ??= []).push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  const weeks = Object.keys(groupedByWeek).sort().reverse();
  const attendancePercentage = calculateAttendancePercentage(records);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  if (unavailable) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={56} color={currentTheme.textSecondary} />
        <Text style={[styles.unavailableTitle, { color: currentTheme.text }]}>Attendance Unavailable</Text>
        <Text style={[styles.unavailableText, { color: currentTheme.textSecondary }]}>
          Your district's HAC portal does not expose attendance data through the API.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.summaryCard, { backgroundColor: currentTheme.surface }]}>
        <View style={styles.percentageContainer}>
          <View style={[styles.percentageCircle, { backgroundColor: currentTheme.primary }]}>
            <Text style={styles.percentageText}>{attendancePercentage}%</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          {[
            { label: 'Present', value: records.filter((r) => r.status === 'present' || r.status === 'excused').length, color: '#00DD88' },
            { label: 'Absent',  value: records.filter((r) => r.status === 'absent').length,  color: '#ff4444' },
            { label: 'Tardy',   value: records.filter((r) => r.status === 'tardy').length,   color: '#FFDD00' },
          ].map((stat, i, arr) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: currentTheme.border }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.recordsContainer}>
        {weeks.map((weekKey) => {
          const weekRecords = groupedByWeek[weekKey].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const weekStart = new Date(weekKey);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          return (
            <View key={weekKey} style={styles.weekSection}>
              <Text style={[styles.weekLabel, { color: currentTheme.text }]}>
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              {weekRecords.map((record) => (
                <View key={record.date} style={[styles.recordItem, { backgroundColor: currentTheme.surface }]}>
                  <View style={styles.recordDate}>
                    <Text style={[styles.recordDateText, { color: currentTheme.textSecondary }]}>
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.recordDayText, { color: currentTheme.text }]}>{new Date(record.date).getDate()}</Text>
                  </View>
                  <View style={styles.recordStatus}>
                    <Ionicons name={getStatusIcon(record.status)} size={20} color={getStatusColor(record.status)} />
                    <View style={styles.recordStatusText}>
                      <Text style={[styles.recordStatusLabel, { color: currentTheme.text }]}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Text>
                      {record.reason && <Text style={[styles.recordReason, { color: currentTheme.textSecondary }]}>{record.reason}</Text>}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', paddingHorizontal: 32 },
  container: { flex: 1 },
  percentageCircle: { alignItems: 'center', borderRadius: 50, height: 100, justifyContent: 'center', width: 100 },
  percentageContainer: { alignItems: 'center', justifyContent: 'center' },
  percentageText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  recordDate: { alignItems: 'center', marginRight: 12, width: 50 },
  recordDateText: { fontSize: 11, fontWeight: '600' },
  recordDayText: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  recordItem: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', marginBottom: 6, paddingHorizontal: 12, paddingVertical: 12 },
  recordReason: { fontSize: 12, marginTop: 2 },
  recordStatus: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  recordStatusLabel: { fontSize: 14, fontWeight: '600' },
  recordStatusText: { flex: 1 },
  recordsContainer: { paddingHorizontal: 16 },
  retryButton: { borderRadius: 8, marginTop: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  statDivider: { height: 40, width: 1 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  summaryCard: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 20, marginHorizontal: 16, marginVertical: 16, paddingHorizontal: 16, paddingVertical: 20 },
  summaryStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  unavailableText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  unavailableTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  weekLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  weekSection: { marginBottom: 16 },
});
