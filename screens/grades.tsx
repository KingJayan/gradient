import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { GradeEntry } from '../services/api/grades';
import { UI_COLORS, gradeLetter, gradeColor } from '../utils/colors';
import { Screen, ScreenHeader, AsyncContent } from '../components/screen';

export default function GradesScreen() {
  const { currentTheme } = useTheme();
  const { cache, loadGradesAndCourses, clearCache } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    clearCache();
    await loadGradesAndCourses();
    setRefreshing(false);
  };

  const grades = useMemo<GradeEntry[]>(() => {
    const gradeList = cache.grades ?? [];
    const assignments = cache.assignments ?? [];
    const assignmentsByClass = new Map<string, typeof assignments>();
    assignments.forEach((a) => {
      if (!assignmentsByClass.has(a.class)) assignmentsByClass.set(a.class, []);
      assignmentsByClass.get(a.class)!.push(a);
    });
    return gradeList.map((g) => {
      const classAssignments = assignmentsByClass.get(g.className) ?? [];
      const categoryMap = new Map<string, { earned: number; possible: number }>();
      classAssignments.forEach((a) => {
        const cat = a.category ?? 'Other';
        if (!categoryMap.has(cat)) categoryMap.set(cat, { earned: 0, possible: 0 });
        if (a.score !== undefined && a.points !== undefined) {
          const entry = categoryMap.get(cat)!;
          entry.earned += a.score;
          entry.possible += a.points;
        }
      });
      const categories = Array.from(categoryMap.entries())
        .filter(([, { possible }]) => possible > 0)
        .map(([name, { earned, possible }]) => ({
          name,
          grade: ((earned / possible) * 100).toFixed(1),
        }));
      return { ...g, categories };
    });
  }, [cache.grades, cache.assignments]);

  return (
    <Screen header={<ScreenHeader title="Your Grades" subtitle="Current marking period overview" />}>
      <AsyncContent loading={cache.loading} error={cache.error} onRetry={onRefresh}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
          }
        >
          <View style={styles.section}>
            {grades.map((grade) => (
              <TouchableOpacity
                key={grade.className}
                style={[styles.gradeCard, { backgroundColor: currentTheme.surface, borderLeftColor: gradeColor(grade.average), borderLeftWidth: 4 }]}
                onPress={() => setExpandedClass(expandedClass === grade.className ? null : grade.className)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${grade.className}, ${grade.average.toFixed(1)}%, grade ${gradeLetter(grade.average)}, ${expandedClass === grade.className ? 'collapse' : 'expand'}`}
              >
                <View style={styles.gradeHeader}>
                  <View style={styles.gradeInfo}>
                    <View style={[styles.classIndicator, { backgroundColor: gradeColor(grade.average) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gradeName, { color: currentTheme.text }]}>{grade.className}</Text>
                      <Text style={[styles.gradeSubtext, { color: currentTheme.textSecondary }]}>
                        {grade.teacher ? `${grade.teacher} · ` : ''}{grade.categories.length} categories
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gradeValueContainer}>
                    <Text style={[styles.gradeLetterText, { color: gradeColor(grade.average) }]}>
                      {gradeLetter(grade.average)}
                    </Text>
                    <Text style={[styles.gradeValue, { color: gradeColor(grade.average) }]}>
                      {grade.average.toFixed(1)}%
                    </Text>
                    <Ionicons
                      name={expandedClass === grade.className ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={currentTheme.textSecondary}
                    />
                  </View>
                </View>

                <View style={[styles.progressBar, { backgroundColor: currentTheme.border }]}>
                  <View style={[styles.progressFill, { width: `${grade.average}%`, backgroundColor: gradeColor(grade.average) }]} />
                </View>

                {expandedClass === grade.className && grade.categories.length > 0 && (
                  <View style={[styles.expandedContent, { borderTopColor: currentTheme.border }]}>
                    <Text style={[styles.assignmentTitle, { color: currentTheme.textSecondary }]}>
                      Category Breakdown
                    </Text>
                    {grade.categories.map((cat, idx) => (
                      <View key={idx} style={styles.assignmentItem}>
                        <View style={styles.assignmentDetails}>
                          <View style={styles.assignmentNameRow}>
                            <View style={[styles.assignmentDot, { backgroundColor: gradeColor(parseFloat(cat.grade)) }]} />
                            <Text style={[styles.assignmentName, { color: currentTheme.text }]}>{cat.name}</Text>
                          </View>
                        </View>
                        <Text style={[styles.assignmentGrade, { color: gradeColor(parseFloat(cat.grade)) }]}>{cat.grade}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {grades.length === 0 && (
              <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No grades available yet.</Text>
            )}
          </View>

          <View style={[styles.legend, { backgroundColor: currentTheme.surface, borderTopColor: currentTheme.border, borderBottomColor: currentTheme.border }]}>
            <Text style={[styles.legendTitle, { color: currentTheme.text }]}>Grade Scale</Text>
            <View style={styles.legendGrid}>
              {[
                { label: 'A (90-100)', color: gradeColor(95) },
                { label: 'B (80-89)', color: gradeColor(85) },
                { label: 'C (70-79)', color: gradeColor(75) },
                { label: 'F (<70)', color: gradeColor(65) },
              ].map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendText, { color: currentTheme.text }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  assignmentDetails: { flex: 1 },
  assignmentDot: { borderRadius: 3.5, height: 7, marginRight: 10, width: 7 },
  assignmentGrade: { fontSize: 15, fontWeight: '700' },
  assignmentItem: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  assignmentName: { fontSize: 14, fontWeight: '600' },
  assignmentNameRow: { alignItems: 'center', flexDirection: 'row' },
  assignmentTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 10, textTransform: 'uppercase' },
  classIndicator: { borderRadius: 2.5, height: 45, marginRight: 14, width: 5 },
  emptyText: { fontSize: 14, marginTop: 40, textAlign: 'center' },
  expandedContent: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  gradeCard: {
    borderRadius: 12,
    elevation: 1,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: UI_COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  gradeHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  gradeInfo: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  gradeLetterText: { fontSize: 13, fontWeight: '700' },
  gradeName: { fontSize: 16, fontWeight: '700' },
  gradeSubtext: { fontSize: 12, marginTop: 4 },
  gradeValue: { fontSize: 22, fontWeight: '800' },
  gradeValueContainer: { alignItems: 'flex-end', gap: 2 },
  legend: { borderBottomWidth: 1, borderRadius: 12, borderTopWidth: 1, marginBottom: 24, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 18 },
  legendDot: { borderRadius: 6, height: 12, marginRight: 10, width: 12 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { alignItems: 'center', flexDirection: 'row', flex: 1, minWidth: '48%' },
  legendText: { fontSize: 12, fontWeight: '600' },
  legendTitle: { fontSize: 14, fontWeight: '700', marginBottom: 14 },
  progressBar: { borderRadius: 4, height: 8, marginBottom: 14, overflow: 'hidden' },
  progressFill: { borderRadius: 4, height: '100%' },
  scrollView: { flex: 1 },
  section: { marginBottom: 24, paddingHorizontal: 16, paddingTop: 16 },
  spacer: { height: 40 },
});
