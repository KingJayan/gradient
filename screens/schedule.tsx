import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassPeriod } from '../services/api/schedule';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { onPrimary } from '../utils/colors';

const BELL_SCHEDULE_KEY = 'bellSchedule';

type BellSchedule = Record<string, { start: string; end: string }>;

function formatBellTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  if (isNaN(h)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${suffix}`;
}

export default function ScheduleScreen() {
  const { currentTheme } = useTheme();
  const { cache, clearCache, loadGradesAndCourses } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);
  const [bellTimes, setBellTimes] = useState<BellSchedule>({});
  const [showBellEditor, setShowBellEditor] = useState(false);
  const [editTimes, setEditTimes] = useState<BellSchedule>({});

  useEffect(() => {
    AsyncStorage.getItem(BELL_SCHEDULE_KEY).then((raw) => {
      if (raw) setBellTimes(JSON.parse(raw));
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    clearCache();
    await loadGradesAndCourses();
    setRefreshing(false);
  };

  const openBellEditor = () => {
    setEditTimes({ ...bellTimes });
    setShowBellEditor(true);
  };

  const saveBellTimes = async () => {
    setBellTimes(editTimes);
    await AsyncStorage.setItem(BELL_SCHEDULE_KEY, JSON.stringify(editTimes));
    setShowBellEditor(false);
  };

  const setEditTime = (periodId: string, field: 'start' | 'end', value: string) => {
    setEditTimes((prev) => ({
      ...prev,
      [periodId]: { start: prev[periodId]?.start ?? '', end: prev[periodId]?.end ?? '', [field]: value },
    }));
  };

  const schedule = cache.schedule ?? [];

  if (cache.loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  if (cache.error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.background }]}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorText, { color: currentTheme.text }]}>{cache.error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary }]} onPress={onRefresh}>
          <Text style={[styles.retryButtonText, { color: onPrimary(currentTheme.primary) }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
        }
      >
        <View style={[styles.scheduleHeader, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
          <Text style={[styles.scheduleTitle, { color: currentTheme.text }]}>Your Schedule</Text>
          <TouchableOpacity
            onPress={openBellEditor}
            style={[styles.bellButton, { backgroundColor: currentTheme.background }]}
            accessibilityRole="button"
            accessibilityLabel="Edit bell times"
          >
            <Ionicons name="time-outline" size={18} color={currentTheme.primary} />
            <Text style={[styles.bellButtonText, { color: currentTheme.primary }]}>Bell Times</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.periodList}>
          {schedule.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={currentTheme.textSecondary} />
              <Text style={[styles.emptyText, { color: currentTheme.text }]}>No schedule data available</Text>
              <Text style={[styles.emptySubtext, { color: currentTheme.textSecondary }]}>
                Pull down to refresh or check your HAC portal.
              </Text>
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary, marginTop: 16 }]} onPress={onRefresh}>
                <Text style={[styles.retryButtonText, { color: onPrimary(currentTheme.primary) }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            schedule.map((period: ClassPeriod) => {
              const bt = bellTimes[period.id];
              return (
                <View key={period.id} style={[styles.periodCard, { backgroundColor: currentTheme.surface }]}>
                  <View style={[styles.periodBadge, { backgroundColor: currentTheme.primary + '22' }]}>
                    <Text style={[styles.periodBadgeText, { color: currentTheme.primary }]}>P{period.id}</Text>
                  </View>
                  <View style={styles.periodInfo}>
                    <Text style={[styles.periodName, { color: currentTheme.text }]}>{period.name}</Text>
                    {bt && (
                      <Text style={[styles.periodTime, { color: currentTheme.primary }]}>
                        {formatBellTime(bt.start)} – {formatBellTime(bt.end)}
                      </Text>
                    )}
                    <View style={styles.periodMeta}>
                      {period.teacher ? (
                        <>
                          <Ionicons name="person" size={13} color={currentTheme.textSecondary} />
                          <Text style={[styles.periodMetaText, { color: currentTheme.textSecondary }]}>{period.teacher}</Text>
                        </>
                      ) : null}
                      {period.room ? (
                        <>
                          <Ionicons name="location" size={13} color={currentTheme.textSecondary} />
                          <Text style={[styles.periodMetaText, { color: currentTheme.textSecondary }]}>Room {period.room}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showBellEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Bell Schedule</Text>
              <TouchableOpacity onPress={() => setShowBellEditor(false)}>
                <Ionicons name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary }]}>
              Enter start and end times for each period (HH:MM, 24-hour).
            </Text>
            <ScrollView style={styles.bellEditorScroll} showsVerticalScrollIndicator={false}>
              {schedule.length === 0 ? (
                <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary, marginTop: 12 }]}>
                  Load your schedule first to configure bell times.
                </Text>
              ) : (
                schedule.map((period) => (
                  <View key={period.id} style={styles.bellRow}>
                    <Text style={[styles.bellPeriodLabel, { color: currentTheme.text }]}>P{period.id}</Text>
                    <TextInput
                      style={[styles.bellInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                      placeholder="08:00"
                      placeholderTextColor={currentTheme.textSecondary}
                      value={editTimes[period.id]?.start ?? ''}
                      onChangeText={(v) => setEditTime(period.id, 'start', v)}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={[styles.bellDash, { color: currentTheme.textSecondary }]}>–</Text>
                    <TextInput
                      style={[styles.bellInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                      placeholder="08:50"
                      placeholderTextColor={currentTheme.textSecondary}
                      value={editTimes[period.id]?.end ?? ''}
                      onChangeText={(v) => setEditTime(period.id, 'end', v)}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: currentTheme.primary }]} onPress={saveBellTimes}>
              <Text style={[styles.saveButtonText, { color: onPrimary(currentTheme.primary) }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bellButton: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  bellButtonText: { fontSize: 13, fontWeight: '600' },
  bellDash: { fontSize: 16, marginHorizontal: 4 },
  bellEditorScroll: { maxHeight: 320 },
  bellInput: { borderRadius: 8, flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 8, textAlign: 'center' },
  bellPeriodLabel: { fontSize: 14, fontWeight: '700', marginRight: 8, width: 28 },
  bellRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  centerContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  container: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptySubtext: { fontSize: 13, marginTop: 6, paddingHorizontal: 32, textAlign: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  errorText: { fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 20 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalSubtitle: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  periodBadge: { alignItems: 'center', borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  periodBadgeText: { fontSize: 14, fontWeight: '700' },
  periodCard: { borderRadius: 12, flexDirection: 'row', gap: 12, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12 },
  periodInfo: { flex: 1 },
  periodList: { paddingBottom: 24, paddingHorizontal: 16 },
  periodMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  periodMetaText: { fontSize: 12, marginRight: 8 },
  periodName: { fontSize: 15, fontWeight: '600' },
  periodTime: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { fontSize: 12, fontWeight: '600' },
  saveButton: { alignItems: 'center', borderRadius: 8, marginTop: 16, paddingVertical: 14 },
  saveButtonText: { fontSize: 16, fontWeight: '600' },
  scheduleHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 24 },
  scheduleTitle: { fontSize: 28, fontWeight: '700' },
});
