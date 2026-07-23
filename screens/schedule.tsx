import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
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
import { RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../utils/tokens';
import { Screen, ScreenHeader, AsyncContent, IconButton, Card, EmptyState, StatBadge, Button } from '../components/screen';
import { Text } from '../components/typography';
import { refreshCompleteHaptic, selectionHaptic } from '../utils/haptics';
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
    refreshCompleteHaptic();
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
      updatedAt={cache.updatedAt}
      right={
        <TouchableOpacity
          onPress={() => { selectionHaptic(); openBellEditor(); }}
          style={[styles.bellButton, { backgroundColor: currentTheme.background }]}
          accessibilityRole="button"
          accessibilityLabel="Edit bell times"
        >
          <Ionicons name="time-outline" size={18} color={currentTheme.primary} />
          <Text variant="subhead" weight="600" color={currentTheme.primary}>Bell Times</Text>
        </TouchableOpacity>
      }
    />
  );

  return (
    <Screen header={header}>
      <AsyncContent loading={cache.loading} error={cache.error} onRetry={onRefresh} hasData={cache.schedule != null}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
          }
        >
          <View style={styles.periodList}>
            {schedule.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No schedule data"
                message="Pull down to refresh, or check your HAC portal."
                actionLabel="Refresh"
                onAction={onRefresh}
              />
            ) : (
              schedule.map((period: ClassPeriod) => {
                const bt = bellTimes[period.id];
                return (
                  <Card key={period.id} style={styles.periodCard}>
                    <StatBadge
                      label={`P${period.id}`}
                      background={currentTheme.primary + '22'}
                      color={currentTheme.primary}
                      style={styles.periodBadge}
                      accessibilityLabel={`Period ${period.id}`}
                    />
                    <View style={styles.periodInfo}>
                      <Text variant="body" weight="600" color={currentTheme.text}>{period.name}</Text>
                      {bt && (
                        <Text variant="subhead" weight="600" tabular color={currentTheme.primary} style={styles.periodTime}>
                          {formatBellTime(bt.start)} – {formatBellTime(bt.end)}
                        </Text>
                      )}
                      <View style={styles.periodMeta}>
                        {period.teacher ? (
                          <>
                            <Ionicons name="person" size={13} color={currentTheme.textSecondary} />
                            <Text variant="subhead" color={currentTheme.textSecondary} style={styles.periodMetaText}>{period.teacher}</Text>
                          </>
                        ) : null}
                        {period.room ? (
                          <>
                            <Ionicons name="location" size={13} color={currentTheme.textSecondary} />
                            <Text variant="subhead" color={currentTheme.textSecondary} style={styles.periodMetaText}>Room {period.room}</Text>
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
              <Text variant="heading" color={currentTheme.text} accessibilityRole="header">Bell Schedule</Text>
              <IconButton
                name="close"
                color={currentTheme.text}
                label="Close bell schedule"
                onPress={() => setShowBellEditor(false)}
              />
            </View>
            <Text variant="subhead" color={currentTheme.textSecondary} style={styles.modalSubtitle}>
              Enter start and end times for each period (HH:MM, 24-hour).
            </Text>
            <ScrollView style={styles.bellEditorScroll} showsVerticalScrollIndicator={false}>
              {schedule.length === 0 ? (
                <Text variant="subhead" color={currentTheme.textSecondary} style={[styles.modalSubtitle, styles.bellEmptyNote]}>
                  Load your schedule first to configure bell times.
                </Text>
              ) : (
                schedule.map((period) => (
                  <View key={period.id} style={styles.bellRow}>
                    <Text
                      variant="body"
                      weight="700"
                      color={currentTheme.text}
                      style={styles.bellPeriodLabel}
                      accessibilityLabel={`Period ${period.id}`}
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
                    <Text variant="body" color={currentTheme.textSecondary} style={styles.bellDash}>–</Text>
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
            <Button title="Save" onPress={saveBellTimes} style={styles.saveButton} accessibilityLabel="Save bell times" />
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
  bellDash: { marginHorizontal: SPACING.xs },
  bellEditorScroll: { maxHeight: 320 },
  bellEmptyNote: { marginTop: SPACING.md },
  bellInput: {
    borderRadius: RADIUS.sm,
    flex: 1,
    fontSize: TYPE.body.size,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.md,
    textAlign: 'center',
  },
  bellPeriodLabel: { marginRight: SPACING.sm, width: 28 },
  bellRow: { alignItems: 'center', flexDirection: 'row', marginBottom: SPACING.md },
  modalContent: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalSubtitle: { lineHeight: 18, marginBottom: SPACING.lg },
  periodBadge: {
    height: TOUCH_TARGET,
    width: TOUCH_TARGET,
  },
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
  periodMetaText: { marginRight: SPACING.sm },
  periodTime: { marginTop: SPACING.xxs },
  saveButton: { marginTop: SPACING.lg },
});
