import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { Theme } from '../context/theme-context';
import { useDataCache } from '../context/data-context';
import { GradeEntry } from '../services/api/grades';
import { UI_COLORS, gradeLetter, gradeColor } from '../utils/colors';
import { FONT, RADIUS, SPACING } from '../utils/tokens';
import { Screen, ScreenHeader, AsyncContent } from '../components/screen';

interface GradeRow extends GradeEntry {
  categories: { name: string; grade: string }[];
}

const GradeCard = React.memo(function GradeCard({
  grade,
  expanded,
  onToggle,
  currentTheme,
}: {
  grade: GradeRow;
  expanded: boolean;
  onToggle: (className: string) => void;
  currentTheme: Theme;
}) {
  const color = gradeColor(grade.average);
  const letter = gradeLetter(grade.average);
  return (
    <TouchableOpacity
      style={[styles.gradeCard, { backgroundColor: currentTheme.surface, borderLeftColor: color, borderLeftWidth: 4 }]}
      onPress={() => onToggle(grade.className)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${grade.className}, ${grade.average.toFixed(1)} percent, grade ${letter}`}
      accessibilityHint={expanded ? 'Collapses the category breakdown' : 'Expands the category breakdown'}
      accessibilityState={{ expanded }}
    >
      <View style={styles.gradeHeader}>
        <View style={styles.gradeInfo}>
          <View style={[styles.classIndicator, { backgroundColor: color }]} />
          <View style={styles.flex1}>
            <Text style={[styles.gradeName, { color: currentTheme.text }]}>{grade.className}</Text>
            <Text style={[styles.gradeSubtext, { color: currentTheme.textSecondary }]}>
              {grade.teacher ? `${grade.teacher} · ` : ''}{grade.categories.length} categories
            </Text>
          </View>
        </View>
        <View style={styles.gradeValueContainer}>
          <Text style={[styles.gradeLetterText, { color }]}>{letter}</Text>
          <Text style={[styles.gradeValue, { color }]}>{grade.average.toFixed(1)}%</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={currentTheme.textSecondary} />
        </View>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: currentTheme.border }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.progressFill, { width: `${grade.average}%`, backgroundColor: color }]} />
      </View>

      {expanded && grade.categories.length > 0 && (
        <View style={[styles.expandedContent, { borderTopColor: currentTheme.border }]}>
          <Text style={[styles.assignmentTitle, { color: currentTheme.textSecondary }]}>Category Breakdown</Text>
          {grade.categories.map((cat, idx) => {
            const catAvg = parseFloat(cat.grade);
            return (
              <View key={idx} style={styles.assignmentItem}>
                <View style={styles.assignmentDetails}>
                  <View style={styles.assignmentNameRow}>
                    <View style={[styles.assignmentDot, { backgroundColor: gradeColor(catAvg) }]} />
                    <Text style={[styles.assignmentName, { color: currentTheme.text }]}>{cat.name}</Text>
                  </View>
                </View>
                <Text
                  style={[styles.assignmentGrade, { color: gradeColor(catAvg) }]}
                  accessibilityLabel={`${cat.grade} percent, grade ${gradeLetter(catAvg)}`}
                >
                  {gradeLetter(catAvg)} · {cat.grade}%
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
});

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

  const toggleClass = useCallback((className: string) => {
    setExpandedClass((prev) => (prev === className ? null : className));
  }, []);

  const grades = useMemo<GradeRow[]>(() => {
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

  const legend = (
    <View style={[styles.legend, { backgroundColor: currentTheme.surface, borderTopColor: currentTheme.border, borderBottomColor: currentTheme.border }]}>
      <Text style={[styles.legendTitle, { color: currentTheme.text }]}>Grade Scale</Text>
      <View style={styles.legendGrid}>
        {[
          { label: 'A (90-100)', color: gradeColor(95) },
          { label: 'B (80-89)', color: gradeColor(85) },
          { label: 'C (70-79)', color: gradeColor(75) },
          { label: 'D (60-69)', color: gradeColor(65) },
          { label: 'F (<60)', color: gradeColor(55) },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: currentTheme.text }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Screen header={<ScreenHeader title="Your Grades" subtitle="Current marking period overview" />}>
      <AsyncContent loading={cache.loading} error={cache.error} onRetry={onRefresh} hasData={cache.grades != null}>
        <FlatList
          style={styles.list}
          data={grades}
          keyExtractor={(item) => item.className}
          extraData={expandedClass}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.section}
          renderItem={({ item }) => (
            <GradeCard
              grade={item}
              expanded={expandedClass === item.className}
              onToggle={toggleClass}
              currentTheme={currentTheme}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: currentTheme.textSecondary }]}>No grades available yet.</Text>
          }
          ListFooterComponent={
            <>
              {legend}
              <View style={styles.spacer} />
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
          }
        />
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  assignmentDetails: { flex: 1 },
  assignmentDot: { borderRadius: RADIUS.pill, height: 7, marginRight: SPACING.md, width: 7 },
  assignmentGrade: { fontSize: FONT.lg, fontWeight: '700' },
  assignmentItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  assignmentName: { fontSize: FONT.base, fontWeight: '600' },
  assignmentNameRow: { alignItems: 'center', flexDirection: 'row' },
  assignmentTitle: {
    fontSize: FONT.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  classIndicator: { borderRadius: RADIUS.pill, height: 45, marginRight: SPACING.lg, width: 5 },
  emptyText: { fontSize: FONT.base, marginTop: SPACING.huge, textAlign: 'center' },
  expandedContent: { borderTopWidth: 1, marginTop: SPACING.lg, paddingTop: SPACING.lg },
  flex1: { flex: 1 },
  gradeCard: {
    borderRadius: RADIUS.md,
    elevation: 1,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    shadowColor: UI_COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  gradeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  gradeInfo: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  gradeLetterText: { fontSize: FONT.md, fontWeight: '700' },
  gradeName: { fontSize: FONT.lg, fontWeight: '700' },
  gradeSubtext: { fontSize: FONT.sm, marginTop: SPACING.xs },
  gradeValue: { fontSize: FONT.xxl, fontWeight: '800' },
  gradeValueContainer: { alignItems: 'flex-end', gap: SPACING.xxs },
  legend: {
    borderBottomWidth: 1,
    borderRadius: RADIUS.md,
    borderTopWidth: 1,
    marginBottom: SPACING.xxl,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  legendDot: { borderRadius: RADIUS.pill, height: 12, marginRight: SPACING.md, width: 12 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg },
  legendItem: { alignItems: 'center', flexDirection: 'row', flex: 1, minWidth: '48%' },
  legendText: { fontSize: FONT.sm, fontWeight: '600' },
  legendTitle: { fontSize: FONT.base, fontWeight: '700', marginBottom: SPACING.lg },
  list: { flex: 1 },
  progressBar: { borderRadius: RADIUS.xs, height: 8, marginBottom: SPACING.lg, overflow: 'hidden' },
  progressFill: { borderRadius: RADIUS.xs, height: '100%' },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  spacer: { height: 40 },
});
