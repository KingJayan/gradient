import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TranscriptEntry, fetchTranscript } from '../services/api/transcript';
import { useCreds } from '../hooks/use-creds';
import { useTheme } from '../hooks/use-theme';
import { useHacQuery } from '../hooks/use-hac-query';
import { gradeColorFromLetter, onPrimary } from '../utils/colors';

export default function TranscriptScreen() {
  const creds = useCreds();
  const { currentTheme } = useTheme();
  const { data, loading, error, refetch } = useHacQuery<TranscriptEntry[]>(
    creds ? 'transcript' : null,
    () => fetchTranscript(creds!.hacUrl, creds!.username, creds!.password)
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const transcript = data ?? [];

  const groupedByYear = transcript.reduce((acc, entry) => {
    (acc[entry.year] ??= []).push(entry);
    return acc;
  }, {} as Record<string, TranscriptEntry[]>);

  const years = Object.keys(groupedByYear).sort().reverse();

  const yearGPA = (entries: TranscriptEntry[]) => {
    const credits = entries.reduce((s, e) => s + e.credits, 0);
    if (credits === 0) return '—';
    return (entries.reduce((s, e) => s + e.gradePoints * e.credits, 0) / credits).toFixed(2);
  };

  const cumulativeGPA = () => {
    if (totalCredits === 0) return '—';
    return (transcript.reduce((s, e) => s + e.gradePoints * e.credits, 0) / totalCredits).toFixed(2);
  };

  const totalCredits = transcript.reduce((s, e) => s + e.credits, 0);


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
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary }]} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', paddingTop: 60 },
  container: { flex: 1 },
  courseContent: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '600' },
  courseRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  courseSemester: { fontSize: 12, marginTop: 2 },
  coursesContainer: { paddingVertical: 8 },
  emptyText: { marginTop: 40, textAlign: 'center' },
  errorText: { fontSize: 14, paddingHorizontal: 32, textAlign: 'center' },
  gpaCard: { alignItems: 'center', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 16 },
  gpaLabel: { fontSize: 12, fontWeight: '600' },
  gpaValue: { fontSize: 32, fontWeight: '700', marginTop: 8 },
  gradeBadge: { borderRadius: 4, marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4 },
  gradeBadgeText: { fontSize: 14, fontWeight: '700' },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 16 },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  totalCredits: { fontSize: 12, marginTop: 4, opacity: 0.9 },
  yearGPA: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  yearHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  yearSection: { borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  yearTitle: { fontSize: 16, fontWeight: '700' },
  yearTitleContainer: { flex: 1 },
  yearsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
});
