import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TranscriptEntry, fetchTranscript } from '../services/api/transcript';
import { useTheme } from '../hooks/use-theme';
import { useScreenData } from '../hooks/use-screen-data';
import { Screen, AsyncContent } from '../components/screen';
import { gradeColorFromLetter, onPrimary } from '../utils/colors';

export default function TranscriptScreen() {
  const { currentTheme } = useTheme();
  const { data, loading, error, refetch } = useScreenData<TranscriptEntry[]>('transcript', (creds) =>
    fetchTranscript(creds.hacUrl, creds.username, creds.password)
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const transcript = data ?? [];

  const groupedByYear = transcript.reduce((acc, entry) => {
    (acc[entry.year] ??= []).push(entry);
    return acc;
  }, {} as Record<string, TranscriptEntry[]>);

  const years = Object.keys(groupedByYear).sort().reverse();
  const totalCredits = transcript.reduce((s, e) => s + e.credits, 0);

  const yearGPA = (entries: TranscriptEntry[]) => {
    const credits = entries.reduce((s, e) => s + e.credits, 0);
    if (credits === 0) return '—';
    return (entries.reduce((s, e) => s + e.gradePoints * e.credits, 0) / credits).toFixed(2);
  };

  const cumulativeGPA = () => {
    if (totalCredits === 0) return '—';
    return (transcript.reduce((s, e) => s + e.gradePoints * e.credits, 0) / totalCredits).toFixed(2);
  };

  return (
    <Screen>
      <AsyncContent loading={loading} error={error} onRetry={refetch}>
        <ScrollView>
          <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
            <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
              <Text style={[styles.gpaLabel, { color: onPrimary(currentTheme.primary) }]}>Cumulative GPA</Text>
              <Text style={[styles.gpaValue, { color: onPrimary(currentTheme.primary) }]}>{cumulativeGPA()}</Text>
              <Text style={[styles.totalCredits, { color: onPrimary(currentTheme.primary) }]}>{totalCredits} total credits</Text>
            </View>
          </View>

          <View style={styles.yearsContainer}>
            {years.length === 0 && (
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No transcript data available.</Text>
            )}
            {years.map((year) => {
              const isExpanded = selectedYear === year;
              const entries = groupedByYear[year];
              return (
                <View key={year} style={[styles.yearSection, { backgroundColor: currentTheme.surface }]}>
                  <TouchableOpacity
                    style={[styles.yearHeader, { borderBottomColor: currentTheme.border }]}
                    onPress={() => setSelectedYear(isExpanded ? null : year)}
                  >
                    <View style={styles.yearTitleContainer}>
                      <Text style={[styles.yearTitle, { color: currentTheme.text }]}>{year}</Text>
                      <Text style={[styles.yearGPA, { color: currentTheme.primary }]}>GPA: {yearGPA(entries)}</Text>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={currentTheme.textSecondary} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.coursesContainer}>
                      {entries.map((entry, i) => (
                        <View key={i} style={[styles.courseRow, { borderBottomColor: currentTheme.border }]}>
                          <View style={styles.courseContent}>
                            <Text style={[styles.courseName, { color: currentTheme.text }]}>{entry.course}</Text>
                            <Text style={[styles.courseSemester, { color: currentTheme.textSecondary }]}>{entry.semester} · {entry.credits} credits</Text>
                          </View>
                          <View style={[styles.gradeBadge, { backgroundColor: gradeColorFromLetter(entry.grade) }]}>
                            <Text style={[styles.gradeBadgeText, { color: onPrimary(gradeColorFromLetter(entry.grade)) }]}>{entry.grade}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  courseContent: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '600' },
  courseRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  courseSemester: { fontSize: 12, marginTop: 2 },
  coursesContainer: { paddingVertical: 8 },
  emptyText: { marginTop: 40, textAlign: 'center' },
  gpaCard: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 16 },
  gpaLabel: { fontSize: 12, fontWeight: '600' },
  gpaValue: { fontSize: 32, fontWeight: '700', marginTop: 8 },
  gradeBadge: { borderRadius: 4, marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4 },
  gradeBadgeText: { fontSize: 14, fontWeight: '700' },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 16 },
  totalCredits: { fontSize: 12, marginTop: 4, opacity: 0.9 },
  yearGPA: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  yearHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  yearSection: { borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  yearTitle: { fontSize: 16, fontWeight: '700' },
  yearTitleContainer: { flex: 1 },
  yearsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
});
