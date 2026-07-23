import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TranscriptEntry, fetchTranscript } from '../services/api/transcript';
import { useTheme } from '../hooks/use-theme';
import { Theme } from '../context/theme-context';
import { useScreenData } from '../hooks/use-screen-data';
import { Screen, AsyncContent, EmptyState } from '../components/screen';
import { gradeColorFromLetter, onPrimary } from '../utils/colors';
import { FONT, RADIUS, SPACING } from '../utils/tokens';

function yearGPA(entries: TranscriptEntry[]): string {
  const credits = entries.reduce((s, e) => s + e.credits, 0);
  if (credits === 0) return '—';
  return (entries.reduce((s, e) => s + e.gradePoints * e.credits, 0) / credits).toFixed(2);
}

const YearSection = React.memo(function YearSection({
  year,
  entries,
  expanded,
  onToggle,
  currentTheme,
}: {
  year: string;
  entries: TranscriptEntry[];
  expanded: boolean;
  onToggle: (year: string) => void;
  currentTheme: Theme;
}) {
  const gpa = yearGPA(entries);
  return (
    <View style={[styles.yearSection, { backgroundColor: currentTheme.surface }]}>
      <TouchableOpacity
        style={[styles.yearHeader, { borderBottomColor: currentTheme.border }]}
        onPress={() => onToggle(year)}
        accessibilityRole="button"
        accessibilityLabel={`${year}, GPA ${gpa}`}
        accessibilityHint={expanded ? 'Collapses the course list' : 'Expands the course list'}
        accessibilityState={{ expanded }}
      >
        <View style={styles.yearTitleContainer}>
          <Text style={[styles.yearTitle, { color: currentTheme.text }]}>{year}</Text>
          <Text style={[styles.yearGPA, { color: currentTheme.primary }]}>GPA: {gpa}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={currentTheme.textSecondary} />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.coursesContainer}>
          {entries.map((entry, i) => (
            <View key={i} style={[styles.courseRow, { borderBottomColor: currentTheme.border }]}>
              <View style={styles.courseContent}>
                <Text style={[styles.courseName, { color: currentTheme.text }]}>{entry.course}</Text>
                <Text style={[styles.courseSemester, { color: currentTheme.textSecondary }]}>{entry.semester} · {entry.credits} credits</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: gradeColorFromLetter(entry.grade) }]}>
                <Text
                  style={[styles.gradeBadgeText, { color: onPrimary(gradeColorFromLetter(entry.grade)) }]}
                  accessibilityLabel={`Grade ${entry.grade}`}
                  maxFontSizeMultiplier={1.4}
                >
                  {entry.grade}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export default function TranscriptScreen() {
  const { currentTheme } = useTheme();
  const { data, loading, error, refetch } = useScreenData<TranscriptEntry[]>('transcript', (creds) =>
    fetchTranscript(creds.hacUrl, creds.username, creds.password)
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const { years, groupedByYear, totalCredits, cumulativeGPA } = useMemo(() => {
    const transcript = data ?? [];
    const grouped = transcript.reduce((acc, entry) => {
      (acc[entry.year] ??= []).push(entry);
      return acc;
    }, {} as Record<string, TranscriptEntry[]>);
    const total = transcript.reduce((s, e) => s + e.credits, 0);
    const cumulative =
      total === 0 ? '—' : (transcript.reduce((s, e) => s + e.gradePoints * e.credits, 0) / total).toFixed(2);
    return {
      years: Object.keys(grouped).sort().reverse(),
      groupedByYear: grouped,
      totalCredits: total,
      cumulativeGPA: cumulative,
    };
  }, [data]);

  const toggleYear = useCallback((year: string) => {
    setSelectedYear((prev) => (prev === year ? null : year));
  }, []);

  const listHeader = (
    <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
      <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
        <Text style={[styles.gpaLabel, { color: onPrimary(currentTheme.primary) }]}>Cumulative GPA</Text>
        <Text style={[styles.gpaValue, { color: onPrimary(currentTheme.primary) }]}>{cumulativeGPA}</Text>
        <Text style={[styles.totalCredits, { color: onPrimary(currentTheme.primary) }]}>{totalCredits} total credits</Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <AsyncContent loading={loading} error={error} onRetry={refetch} hasData={data != null}>
        {listHeader}
        <FlatList
          data={years}
          keyExtractor={(year) => year}
          extraData={selectedYear}
          contentContainerStyle={styles.yearsContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <YearSection
              year={item}
              entries={groupedByYear[item]}
              expanded={selectedYear === item}
              onToggle={toggleYear}
              currentTheme={currentTheme}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-outline"
              title="No transcript data"
              message="Your transcript will appear here once your school posts it."
              actionLabel="Refresh"
              onAction={refetch}
            />
          }
        />
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseContent: { flex: 1 },
  courseName: { fontSize: FONT.base, fontWeight: '600' },
  courseRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  courseSemester: { fontSize: FONT.sm, marginTop: SPACING.xxs },
  coursesContainer: { paddingVertical: SPACING.sm },
  gpaCard: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  gpaLabel: { fontSize: FONT.sm, fontWeight: '600' },
  gpaValue: { fontSize: FONT.hero, fontWeight: '700', marginTop: SPACING.sm },
  gradeBadge: {
    borderRadius: RADIUS.xs,
    marginLeft: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  gradeBadgeText: { fontSize: FONT.base, fontWeight: '700' },
  header: {
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  totalCredits: { fontSize: FONT.sm, marginTop: SPACING.xs, opacity: 0.9 },
  yearGPA: { fontSize: FONT.sm, fontWeight: '600', marginTop: SPACING.xs },
  yearHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  yearSection: { borderRadius: RADIUS.sm, marginBottom: SPACING.sm, overflow: 'hidden' },
  yearTitle: { fontSize: FONT.lg, fontWeight: '700' },
  yearTitleContainer: { flex: 1 },
  yearsContainer: { paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
});
