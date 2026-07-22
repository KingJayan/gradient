import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassPeriod } from '../services/api/schedule';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { Screen, ScreenHeader, AsyncContent, RetryButton, IconButton, Card } from '../components/screen';
import { LOCAL_KEYS } from '../utils/storage';

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
    AsyncStorage.getItem(LOCAL_KEYS.bellSchedule).then((raw) => {
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
    await AsyncStorage.setItem(LOCAL_KEYS.bellSchedule, JSON.stringify(editTimes));
    setShowBellEditor(false);
  };

  const setEditTime = (periodId: string, field: 'start' | 'end', value: string) => {
    setEditTimes((prev) => ({
      ...prev,
      [periodId]: { start: prev[periodId]?.start ?? '', end: prev[periodId]?.end ?? '', [field]: value },
    }));
  };

  const schedule = cache.schedule ?? [];

  const header = (
    <ScreenHeader
      title="Your Schedule"
      right={
        <TouchableOpacity
          onPress={openBellEditor}
          style={[styles.bellButton, { backgroundColor: currentTheme.background }]}
          accessibilityRole="button"
          accessibilityLabel="Edit bell times"
        >
          <Ionicons name="time-outline" size={18} color={currentTheme.primary} />
          <Text style={[styles.bellButtonText, { color: currentTheme.primary }]}>Bell Times</Text>
        </TouchableOpacity>
      }
    />
  );

  return (
    <Screen header={header}>
      <AsyncContent loading={cache.loading} error={cache.error} onRetry={onRefresh} hasData={cache.schedule != null}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
          }
        >
          <View style={styles.periodList}>
            {schedule.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={currentTheme.textSecondary} />
                <Text style={[styles.emptyText, { color: currentTheme.text }]}>No schedule data available</Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.textSecondary }]}>
                  Pull down to refresh or check your HAC portal.
                </Text>
                <RetryButton onPress={onRefresh} style={styles.emptyRetry} />
              </View>
            ) : (
              schedule.map((period: ClassPeriod) => {
                const bt = bellTimes[period.id];
                return (
                  <Card key={period.id} style={styles.periodCard}>
                    <View style={[styles.periodBadge, { backgroundColor: currentTheme.primary + '22' }]}>
                      <Text
                        style={[styles.periodBadgeText, { color: currentTheme.primary }]}
                        accessibilityLabel={`Period ${period.id}`}
                        maxFontSizeMultiplier={1.3}
                      >
                        P{period.id}
                      </Text>
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
                  </Card>
                );
              })
            )}
          </View>
        </ScrollView>
      </AsyncContent>

      <Modal
        visible={showBellEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBellEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]} accessibilityRole="header">Bell Schedule</Text>
              <IconButton
                name="close"
                color={currentTheme.text}
                label="Close bell schedule"
                onPress={() => setShowBellEditor(false)}
              />
            </View>
            <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary }]}>
              Enter start and end times for each period (HH:MM, 24-hour).
            </Text>
            <ScrollView style={styles.bellEditorScroll} showsVerticalScrollIndicator={false}>
              {schedule.length === 0 ? (
                <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary, marginTop: SPACING.md }]}>
                  Load your schedule first to configure bell times.
                </Text>
              ) : (
                schedule.map((period) => (
                  <View key={period.id} style={styles.bellRow}>
                    <Text
                      style={[styles.bellPeriodLabel, { color: currentTheme.text }]}
                      accessibilityLabel={`Period ${period.id}`}
                      maxFontSizeMultiplier={1.3}
                    >
                      P{period.id}
                    </Text>
                    <TextInput
                      style={[styles.bellInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                      placeholder="08:00"
                      placeholderTextColor={currentTheme.textSecondary}
                      value={editTimes[period.id]?.start ?? ''}
                      onChangeText={(v) => setEditTime(period.id, 'start', v)}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      accessibilityLabel={`Period ${period.id} start time, 24-hour`}
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
                      accessibilityLabel={`Period ${period.id} end time, 24-hour`}
                    />
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: currentTheme.primary }]}
              onPress={saveBellTimes}
              accessibilityRole="button"
              accessibilityLabel="Save bell times"
            >
              <Text style={[styles.saveButtonText, { color: onPrimary(currentTheme.primary) }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.md,
  },
  bellButtonText: { fontSize: FONT.md, fontWeight: '600' },
  bellDash: { fontSize: FONT.lg, marginHorizontal: SPACING.xs },
  bellEditorScroll: { maxHeight: 320 },
  bellInput: {
    borderRadius: RADIUS.sm,
    flex: 1,
    fontSize: FONT.base,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.md,
    textAlign: 'center',
  },
  bellPeriodLabel: { fontSize: FONT.base, fontWeight: '700', marginRight: SPACING.sm, width: 28 },
  bellRow: { alignItems: 'center', flexDirection: 'row', marginBottom: SPACING.md },
  emptyRetry: { marginTop: SPACING.lg },
  emptyState: { alignItems: 'center', paddingTop: SPACING.giant },
  emptySubtext: { fontSize: FONT.md, marginTop: SPACING.sm, paddingHorizontal: SPACING.xxxl, textAlign: 'center' },
  emptyText: { fontSize: FONT.lg, fontWeight: '600', marginTop: SPACING.md },
  modalContent: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalSubtitle: { fontSize: FONT.sm, lineHeight: 18, marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT.xl, fontWeight: '700' },
  periodBadge: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    height: TOUCH_TARGET,
    justifyContent: 'center',
    width: TOUCH_TARGET,
  },
  periodBadgeText: { fontSize: FONT.base, fontWeight: '700' },
  periodCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  periodInfo: { flex: 1 },
  periodList: { paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  periodMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  periodMetaText: { fontSize: FONT.sm, marginRight: SPACING.sm },
  periodName: { fontSize: FONT.lg, fontWeight: '600' },
  periodTime: { fontSize: FONT.sm, fontWeight: '600', marginTop: SPACING.xxs },
  saveButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: TOUCH_TARGET,
  },
  saveButtonText: { fontSize: FONT.lg, fontWeight: '600' },
});
