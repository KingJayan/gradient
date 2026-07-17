import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TranscriptEntry } from '../utils/schedule-data';
import { useCreds } from '../hooks/use-creds';
import { useTheme } from '../hooks/use-theme';
import { fetchTranscript } from '../services/hac-api';

export default function TranscriptScreen() {
  const creds = useCreds();
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  useEffect(() => {
    loadTranscript();
  }, [creds]);

  const loadTranscript = async () => {
    if (!creds) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      setTranscript(await fetchTranscript(creds.hacUrl, creds.username, creds.password));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load transcript';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const groupedByYear = transcript.reduce((acc, entry) => {
    (acc[entry.year] ??= []).push(entry);
    return acc;
  }, {} as Record<string, TranscriptEntry[]>);

  const years = Object.keys(groupedByYear).sort().reverse();

  const yearGPA = (entries: TranscriptEntry[]) =>
    (entries.reduce((s, e) => s + e.gradePoints, 0) / entries.length).toFixed(2);

  const cumulativeGPA = () =>
    transcript.length > 0
      ? (transcript.reduce((s, e) => s + e.gradePoints, 0) / transcript.length).toFixed(2)
      : '—';

  const totalCredits = transcript.reduce((s, e) => s + e.credits, 0);

  const gradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#00DD88';
    if (grade.startsWith('B')) return '#00DDFF';
    if (grade.startsWith('C')) return '#FFDD00';
    if (grade.startsWith('D')) return '#FF8844';
    return '#ff4444';
  };

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
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentTheme.primary }]} onPress={loadTranscript}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
          <Text style={styles.gpaLabel}>Cumulative GPA</Text>
          <Text style={styles.gpaValue}>{cumulativeGPA()}</Text>
          <Text style={styles.totalCredits}>{totalCredits} total credits</Text>
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
                      <View style={[styles.gradeBadge, { backgroundColor: gradeColor(entry.grade) }]}>
                        <Text style={styles.gradeBadgeText}>{entry.grade}</Text>
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
  gpaLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  gpaValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 8 },
  gradeBadge: { borderRadius: 4, marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4 },
  gradeBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  header: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 16 },
  retryButton: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  totalCredits: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.9 },
  yearGPA: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  yearHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  yearSection: { borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  yearTitle: { fontSize: 16, fontWeight: '700' },
  yearTitleContainer: { flex: 1 },
  yearsContainer: { paddingHorizontal: 16, paddingVertical: 12 },
});
