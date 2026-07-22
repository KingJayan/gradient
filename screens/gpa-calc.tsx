import React, { useState, useEffect, useMemo } from 'react';
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
import {
  calculateGPA,
  Course,
  DEFAULT_GRADE_SCALE,
  predictedGradeNeeded,
  UNREACHABLE_GRADE,
  whatIfScenario,
} from '../utils/gpa-calculator';
import { UI_COLORS, onPrimary, gradeLetter } from '../utils/colors';
import { FONT, RADIUS, SPACING, TOUCH_TARGET } from '../utils/tokens';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { Screen, ScreenHeader, AsyncContent, IconButton } from '../components/screen';

const TARGET_GPAS = [3.0, 3.5, 4.0];

export default function GPACalculatorScreen() {
  const { currentTheme } = useTheme();
  const { cache, clearCache, loadGradesAndCourses } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mockScenario, setMockScenario] = useState<{ courseId: string; mockGrade: number }[]>([]);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [mockGradeInput, setMockGradeInput] = useState('');
  const [targetGPA, setTargetGPA] = useState(TARGET_GPAS[1]);

  useEffect(() => {
    if (cache.courses) setCourses(cache.courses);
  }, [cache.courses]);

  const gpaResult = useMemo(
    () => (courses.length > 0 ? calculateGPA(courses, DEFAULT_GRADE_SCALE) : null),
    [courses]
  );

  const scenarioGPA = useMemo(
    () => (mockScenario.length > 0 ? whatIfScenario(courses, mockScenario, DEFAULT_GRADE_SCALE) : null),
    [mockScenario, courses]
  );

  const gradeNeeded = useMemo(
    () => (courses.length > 0 ? predictedGradeNeeded(targetGPA, courses) : null),
    [courses, targetGPA]
  );

  const gradeNeededText =
    gradeNeeded === null
      ? ''
      : gradeNeeded === 0
        ? `Your current courses already reach a ${targetGPA.toFixed(1)}.`
        : gradeNeeded === UNREACHABLE_GRADE
          ? `A ${targetGPA.toFixed(1)} is out of reach with these courses, even with perfect scores.`
          : `Average ${gradeNeeded}% across your courses to finish at a ${targetGPA.toFixed(1)}.`;

  const handleToggleCourseExclusion = (courseId: string) => {
    setCourses(courses.map((c) => (c.id === courseId ? { ...c, excluded: !c.excluded } : c)));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    clearCache();
    await loadGradesAndCourses();
    setRefreshing(false);
  };

  const handleToggleWeight = (courseId: string) => {
    setCourses(courses.map((c) => {
      if (c.id !== courseId) return c;
      const next = c.weight === 0 ? 0.5 : c.weight === 0.5 ? 1.0 : 0;
      return { ...c, weight: next };
    }));
  };

  const handleAddMockGrade = () => {
    if (!selectedCourseId || !mockGradeInput) return;
    const grade = Math.min(100, Math.max(0, parseInt(mockGradeInput, 10)));
    const idx = mockScenario.findIndex((m) => m.courseId === selectedCourseId);
    if (idx >= 0) {
      const updated = [...mockScenario];
      updated[idx].mockGrade = grade;
      setMockScenario(updated);
    } else {
      setMockScenario([...mockScenario, { courseId: selectedCourseId, mockGrade: grade }]);
    }
    setMockGradeInput('');
    setSelectedCourseId(null);
    setShowWhatIf(false);
  };

  return (
    <Screen header={<ScreenHeader title="GPA Calculator" />}>
      <AsyncContent
        loading={cache.loading}
        error={cache.error}
        onRetry={onRefresh}
        hasData={!!gpaResult}
        isEmpty={!gpaResult}
        empty={
          <View style={styles.emptyState}>
            <Ionicons name="calculator-outline" size={48} color={currentTheme.textSecondary} />
            <Text style={[styles.emptyText, { color: currentTheme.text }]}>No courses to calculate</Text>
          </View>
        }
      >
    {gpaResult && (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
      }
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Current GPA</Text>
        <View style={styles.gpaGrid}>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text style={[styles.gpaLabel, { color: onPrimary(currentTheme.primary) }]}>Weighted</Text>
            <Text style={[styles.gpaValue, { color: onPrimary(currentTheme.primary) }]}>{gpaResult.weighted}</Text>
          </View>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text style={[styles.gpaLabel, { color: onPrimary(currentTheme.primary) }]}>Unweighted</Text>
            <Text style={[styles.gpaValue, { color: onPrimary(currentTheme.primary) }]}>{gpaResult.unweighted}</Text>
          </View>
        </View>
        <Text style={[styles.courseCount, { color: currentTheme.textSecondary }]}>
          {gpaResult.courseCount} courses · {gpaResult.totalCredits} credits
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>What Do I Need?</Text>
        <View style={styles.targetRow} accessibilityRole="radiogroup">
          {TARGET_GPAS.map((target) => {
            const selected = target === targetGPA;
            return (
              <TouchableOpacity
                key={target}
                style={[
                  styles.targetChip,
                  {
                    backgroundColor: selected ? currentTheme.primary : currentTheme.surface,
                    borderColor: selected ? currentTheme.primary : currentTheme.border,
                  },
                ]}
                onPress={() => setTargetGPA(target)}
                accessibilityRole="radio"
                accessibilityLabel={`Target GPA ${target.toFixed(1)}`}
                accessibilityState={{ checked: selected }}
              >
                <Text
                  style={[
                    styles.targetChipText,
                    { color: selected ? onPrimary(currentTheme.primary) : currentTheme.text },
                  ]}
                >
                  {target.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.targetResult, { color: currentTheme.textSecondary }]}>{gradeNeededText}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Your Courses</Text>
        {courses.map((course) => {
          const mockGrade = mockScenario.find((m) => m.courseId === course.id)?.mockGrade;
          return (
            <View key={course.id} style={[styles.courseCard, { backgroundColor: currentTheme.surface }]}>
              <View style={styles.courseHeader}>
                <View style={styles.courseInfo}>
                  <Text style={[styles.courseName, { color: currentTheme.text }]}>{course.name}</Text>
                  <Text style={[styles.courseCredits, { color: currentTheme.textSecondary }]}>{course.credits} credits</Text>
                </View>
                <View style={styles.courseActions}>
                  <TouchableOpacity
                    style={[styles.weightBadge, { backgroundColor: course.weight === 1.0 ? UI_COLORS.info : course.weight === 0.5 ? UI_COLORS.warning : currentTheme.border }]}
                    onPress={() => handleToggleWeight(course.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${course.name} weight: ${course.weight === 1.0 ? 'AP' : course.weight === 0.5 ? 'Honors' : 'Regular'}`}
                    accessibilityHint="Cycles the course weight"
                  >
                    <Text
                      style={[styles.weightBadgeText, { color: course.weight > 0 ? UI_COLORS.white : currentTheme.textSecondary }]}
                      maxFontSizeMultiplier={1.4}
                    >
                      {course.weight === 1.0 ? 'AP' : course.weight === 0.5 ? 'HON' : 'REG'}
                    </Text>
                  </TouchableOpacity>
                  <IconButton
                    name={course.excluded ? 'eye-off' : 'eye'}
                    size={20}
                    color={course.excluded ? currentTheme.textSecondary : currentTheme.primary}
                    label={`${course.excluded ? 'Include' : 'Exclude'} ${course.name} in GPA`}
                    state={{ selected: !course.excluded }}
                    onPress={() => handleToggleCourseExclusion(course.id)}
                  />
                </View>
              </View>
              <View style={styles.gradeRow}>
                <Text
                  style={[styles.gradeLabel, { color: currentTheme.primary }]}
                  accessibilityLabel={`Current grade ${course.grade.toFixed(1)} percent, ${gradeLetter(course.grade)}`}
                >
                  Current: {course.grade.toFixed(1)}% ({gradeLetter(course.grade)})
                </Text>
                {mockGrade !== undefined && (
                  <Text style={styles.mockLabel}>Mock: {mockGrade}%</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.whatIfButton}
                onPress={() => { setSelectedCourseId(course.id); setShowWhatIf(true); }}
                accessibilityRole="button"
                accessibilityLabel={`Add mock grade for ${course.name}`}
              >
                <Ionicons name="add-circle" size={16} color={currentTheme.primary} />
                <Text style={[styles.whatIfButtonText, { color: currentTheme.primary }]}>Add Mock Grade</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {scenarioGPA && (
        <View style={styles.section}>
          <View style={styles.scenarioHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Scenario Result</Text>
            <TouchableOpacity
              style={styles.clearButtonHit}
              onPress={() => setMockScenario([])}
              accessibilityRole="button"
              accessibilityLabel="Clear all mock grades"
            >
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scenarioGrid}>
            {[
              { label: 'Weighted', current: gpaResult.weighted, scenario: scenarioGPA.weighted },
              { label: 'Unweighted', current: gpaResult.unweighted, scenario: scenarioGPA.unweighted },
            ].map((item) => (
              <View key={item.label} style={[styles.scenarioCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
                <Text style={[styles.scenarioLabel, { color: currentTheme.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.scenarioValue, { color: currentTheme.primary }]}>{item.scenario}</Text>
                <Text style={[styles.scenarioDelta, { color: currentTheme.text }]}>
                  {item.scenario > item.current ? '+' : ''}{(item.scenario - item.current).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={showWhatIf}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowWhatIf(false); setSelectedCourseId(null); setMockGradeInput(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>What-If Calculator</Text>
              <IconButton
                name="close"
                color={currentTheme.text}
                label="Close what-if calculator"
                onPress={() => { setShowWhatIf(false); setSelectedCourseId(null); setMockGradeInput(''); }}
              />
            </View>
            {selectedCourseId && (
              <>
                <Text style={[styles.modalLabel, { color: currentTheme.text }]}>
                  {courses.find((c) => c.id === selectedCourseId)?.name}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.background, color: currentTheme.text }]}
                  placeholder="Enter predicted grade (0-100)"
                  placeholderTextColor={currentTheme.textSecondary}
                  value={mockGradeInput}
                  onChangeText={setMockGradeInput}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Predicted grade, 0 to 100"
                />
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: currentTheme.primary }]}
                  onPress={handleAddMockGrade}
                  accessibilityRole="button"
                  accessibilityLabel="Add to scenario"
                >
                  <Text style={[styles.modalButtonText, { color: onPrimary(currentTheme.primary) }]}>Add to Scenario</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    )}
      </AsyncContent>
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearButton: { color: UI_COLORS.danger, fontSize: FONT.sm, fontWeight: '600' },
  clearButtonHit: { justifyContent: 'center', minHeight: TOUCH_TARGET, paddingHorizontal: SPACING.xs },
  courseActions: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md },
  courseCard: {
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  courseCount: { fontSize: FONT.sm, textAlign: 'center' },
  courseCredits: { fontSize: FONT.sm, marginTop: SPACING.xs },
  courseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  courseInfo: { flex: 1 },
  courseName: { fontSize: FONT.lg, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: SPACING.giant },
  emptyText: { fontSize: FONT.lg, fontWeight: '600', marginTop: SPACING.md },
  gpaCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  gpaGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  gpaLabel: { fontSize: FONT.sm, fontWeight: '600' },
  gpaValue: { fontSize: FONT.hero, fontWeight: '700', marginTop: SPACING.sm },
  gradeLabel: { fontSize: FONT.base, fontWeight: '600' },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  mockLabel: { color: UI_COLORS.info, fontSize: FONT.base, fontWeight: '600' },
  modalButton: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  modalButtonText: { fontSize: FONT.lg, fontWeight: '600' },
  modalContent: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  modalInput: {
    borderRadius: RADIUS.sm,
    fontSize: FONT.lg,
    marginBottom: SPACING.lg,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.lg,
  },
  modalLabel: { fontSize: FONT.base, fontWeight: '600', marginBottom: SPACING.sm },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalTitle: { fontSize: FONT.xl, fontWeight: '700' },
  scenarioCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  scenarioDelta: { fontSize: FONT.sm, fontWeight: '600', marginTop: SPACING.xs },
  scenarioGrid: { flexDirection: 'row', gap: SPACING.md },
  scenarioHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  scenarioLabel: { fontSize: FONT.sm, fontWeight: '600' },
  scenarioValue: { fontSize: FONT.display, fontWeight: '700', marginTop: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  sectionTitle: { fontSize: FONT.xl, fontWeight: '700', marginBottom: SPACING.md },
  targetChip: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  targetChipText: { fontSize: FONT.lg, fontWeight: '700' },
  targetResult: { fontSize: FONT.base, lineHeight: 20, marginTop: SPACING.md },
  targetRow: { flexDirection: 'row', gap: SPACING.md },
  weightBadge: { borderRadius: RADIUS.xs, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  weightBadgeText: { fontSize: FONT.xs, fontWeight: '700' },
  whatIfButton: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minHeight: TOUCH_TARGET },
  whatIfButtonText: { fontSize: FONT.sm, fontWeight: '600', marginLeft: SPACING.xs },
});
