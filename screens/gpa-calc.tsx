import React, { useState, useEffect, useMemo } from 'react';
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
import {
  calculateGPA,
  Course,
  DEFAULT_GRADE_SCALE,
  predictedGradeNeeded,
  UNREACHABLE_GRADE,
  whatIfScenario,
} from '../utils/gpa-calculator';
import { UI_COLORS, onPrimary, gradeLetter } from '../utils/colors';
import { RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../utils/tokens';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { Screen, ScreenHeader, AsyncContent, IconButton, Card, EmptyState, StatBadge, Button } from '../components/screen';
import { Text } from '../components/typography';
import { TrendChart } from '../components/charts';
import { gpaSeries, loadGradeHistory, GradeSnapshot } from '../utils/grade-history';
import { refreshCompleteHaptic, selectionHaptic } from '../utils/haptics';

const TARGET_GPAS = [3.0, 3.5, 4.0];

export default function GPACalculatorScreen() {
  const { currentTheme } = useTheme();
  const { cache, clearCache, loadGradesAndCourses } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mockScenario, setMockScenario] = useState<{ courseId: string; mockGrade: number }[]>([]);
  const [showMock, setShowMock] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [mockGradeInput, setMockGradeInput] = useState('');
  const [targetGPA, setTargetGPA] = useState(TARGET_GPAS[1]);
  const [showFormula, setShowFormula] = useState(false);
  const [history, setHistory] = useState<GradeSnapshot[]>([]);

  useEffect(() => {
    if (cache.courses) setCourses(cache.courses);
  }, [cache.courses]);

  useEffect(() => {
    loadGradeHistory().then(setHistory);
  }, [cache.updatedAt]);

  const gpaTrend = useMemo(
    () => (courses.length > 0 ? gpaSeries(history, courses).map((p) => p.gpa) : []),
    [history, courses]
  );

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
    refreshCompleteHaptic();
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
    setShowMock(false);
  };

  return (
    <Screen header={<ScreenHeader title="GPA Calculator" updatedAt={cache.updatedAt} />}>
      <AsyncContent
        loading={cache.loading}
        error={cache.error}
        onRetry={onRefresh}
        hasData={!!gpaResult}
        isEmpty={!gpaResult}
        empty={
          <EmptyState
            icon="calculator-outline"
            title="No courses to calculate"
            message="Your GPA appears here once your grades have loaded."
          />
        }
      >
    {gpaResult && (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
      }
    >
      <View style={styles.section}>
        <View style={styles.currentGpaHeader}>
          <Text variant="heading" color={currentTheme.text}>Current GPA</Text>
          <IconButton
            name="information-circle-outline"
            size={22}
            color={currentTheme.textSecondary}
            label="How is GPA calculated?"
            onPress={() => setShowFormula(true)}
          />
        </View>
        <View style={styles.gpaGrid}>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text variant="subhead" weight="600" color={onPrimary(currentTheme.primary)}>Weighted</Text>
            <Text variant="hero" weight="700" tabular color={onPrimary(currentTheme.primary)} style={styles.gpaValue}>{gpaResult.weighted}</Text>
          </View>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text variant="subhead" weight="600" color={onPrimary(currentTheme.primary)}>Unweighted</Text>
            <Text variant="hero" weight="700" tabular color={onPrimary(currentTheme.primary)} style={styles.gpaValue}>{gpaResult.unweighted}</Text>
          </View>
        </View>
        <Text variant="subhead" tabular color={currentTheme.textSecondary} style={styles.courseCount}>
          {gpaResult.courseCount} courses · {gpaResult.totalCredits} credits
        </Text>
      </View>

      {gpaTrend.length >= 2 && (
        <View style={styles.section}>
          <Text variant="heading" color={currentTheme.text} style={styles.sectionTitle}>GPA Over Time</Text>
          <Card style={styles.trendCard}>
            <TrendChart values={gpaTrend} color={currentTheme.primary} format={(v) => v.toFixed(2)} />
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.scenarioHeader}>
          <Text variant="heading" color={currentTheme.text}>What If?</Text>
          {scenarioGPA && (
            <TouchableOpacity
              style={styles.clearButtonHit}
              onPress={() => { selectionHaptic(); setMockScenario([]); }}
              accessibilityRole="button"
              accessibilityLabel="Clear all mock grades"
            >
              <Text variant="subhead" weight="600" color={UI_COLORS.danger}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
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
                onPress={() => { selectionHaptic(); setTargetGPA(target); }}
                accessibilityRole="radio"
                accessibilityLabel={`Target GPA ${target.toFixed(1)}`}
                accessibilityState={{ checked: selected }}
              >
                <Text variant="body" weight="700" tabular color={selected ? onPrimary(currentTheme.primary) : currentTheme.text}>
                  {target.toFixed(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text variant="body" color={currentTheme.textSecondary} style={styles.targetResult}>{gradeNeededText}</Text>
        {scenarioGPA && (
          <View style={styles.scenarioGrid}>
            {[
              { label: 'Weighted', current: gpaResult.weighted, scenario: scenarioGPA.weighted },
              { label: 'Unweighted', current: gpaResult.unweighted, scenario: scenarioGPA.unweighted },
            ].map((item) => (
              <View key={item.label} style={[styles.scenarioCard, { backgroundColor: currentTheme.surface, borderColor: currentTheme.primary }]}>
                <Text variant="subhead" weight="600" color={currentTheme.textSecondary}>{item.label}</Text>
                <Text variant="title" weight="700" tabular color={currentTheme.primary} style={styles.scenarioValue}>{item.scenario}</Text>
                <Text variant="subhead" weight="600" tabular color={currentTheme.text} style={styles.scenarioDelta}>
                  {item.scenario > item.current ? '+' : ''}{(item.scenario - item.current).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="heading" color={currentTheme.text} style={styles.sectionTitle}>Your Courses</Text>
        {courses.map((course) => {
          const mockGrade = mockScenario.find((m) => m.courseId === course.id)?.mockGrade;
          return (
            <Card key={course.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseInfo}>
                  <Text variant="body" weight="600" color={currentTheme.text}>{course.name}</Text>
                  <Text variant="subhead" tabular color={currentTheme.textSecondary} style={styles.courseCredits}>{course.credits} credits</Text>
                </View>
                <View style={styles.courseActions}>
                  <StatBadge
                    label={course.weight === 1.0 ? 'AP' : course.weight === 0.5 ? 'HON' : 'REG'}
                    background={course.weight === 1.0 ? UI_COLORS.info : course.weight === 0.5 ? UI_COLORS.warning : currentTheme.border}
                    color={course.weight > 0 ? UI_COLORS.white : currentTheme.textSecondary}
                    onPress={() => handleToggleWeight(course.id)}
                    style={styles.weightBadge}
                    accessibilityLabel={`${course.name} weight: ${course.weight === 1.0 ? 'AP' : course.weight === 0.5 ? 'Honors' : 'Regular'}`}
                    accessibilityHint="Cycles the course weight"
                  />
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
                  variant="body"
                  weight="600"
                  tabular
                  color={currentTheme.primary}
                  accessibilityLabel={`Current grade ${course.grade.toFixed(1)} percent, ${gradeLetter(course.grade)}`}
                >
                  Current: {course.grade.toFixed(1)}% ({gradeLetter(course.grade)})
                </Text>
                {mockGrade !== undefined && (
                  <Text variant="body" weight="600" tabular color={UI_COLORS.info}>Mock: {mockGrade}%</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.mockButton}
                onPress={() => { selectionHaptic(); setSelectedCourseId(course.id); setShowMock(true); }}
                accessibilityRole="button"
                accessibilityLabel={`Add mock grade for ${course.name}`}
              >
                <Ionicons name="add-circle" size={16} color={currentTheme.primary} />
                <Text variant="subhead" weight="600" color={currentTheme.primary} style={styles.mockButtonText}>Add Mock Grade</Text>
              </TouchableOpacity>
            </Card>
          );
        })}
      </View>

      <Modal
        visible={showMock}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowMock(false); setSelectedCourseId(null); setMockGradeInput(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="heading" color={currentTheme.text}>Mock Grade</Text>
              <IconButton
                name="close"
                color={currentTheme.text}
                label="Close mock grade"
                onPress={() => { setShowMock(false); setSelectedCourseId(null); setMockGradeInput(''); }}
              />
            </View>
            {selectedCourseId && (
              <>
                <Text variant="body" weight="600" color={currentTheme.text} style={styles.modalLabel}>
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
                <Button title="Add to Scenario" onPress={handleAddMockGrade} />
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFormula}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormula(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="heading" color={currentTheme.text} accessibilityRole="header">How GPA is calculated</Text>
              <IconButton
                name="close"
                color={currentTheme.text}
                label="Close GPA explanation"
                onPress={() => setShowFormula(false)}
              />
            </View>
            <Text variant="body" color={currentTheme.textSecondary} style={styles.formulaText}>
              Each class average maps to grade points on a 4.0 scale (A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0.0).
            </Text>
            <Text variant="body" color={currentTheme.textSecondary} style={styles.formulaText}>
              The unweighted GPA is the plain average of those points across your courses.
            </Text>
            <Text variant="body" color={currentTheme.textSecondary} style={styles.formulaText}>
              The weighted GPA adds a bonus per course before averaging by credits — +1.0 for AP and +0.5 for Honors:
            </Text>
            <Text variant="body" weight="700" color={currentTheme.text} style={styles.formulaEquation}>
              weighted = Σ (points + weight) × credits ÷ Σ credits
            </Text>
            <Text variant="body" color={currentTheme.textSecondary} style={styles.formulaText}>
              Tap a course&apos;s badge to switch it between AP, Honors, and Regular, or the eye icon to exclude it.
            </Text>
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
  clearButtonHit: { justifyContent: 'center', minHeight: TOUCH_TARGET, paddingHorizontal: SPACING.xs },
  courseActions: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md },
  courseCard: {
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  courseCount: { textAlign: 'center' },
  courseCredits: { marginTop: SPACING.xs },
  courseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  courseInfo: { flex: 1 },
  currentGpaHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  formulaEquation: { marginBottom: SPACING.md },
  formulaText: { lineHeight: 20, marginBottom: SPACING.md },
  gpaCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  gpaGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  gpaValue: { marginTop: SPACING.sm },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  mockButton: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minHeight: TOUCH_TARGET },
  mockButtonText: { marginLeft: SPACING.xs },
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
    fontSize: TYPE.body.size,
    marginBottom: SPACING.lg,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.lg,
  },
  modalLabel: { marginBottom: SPACING.sm },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  scenarioCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  scenarioDelta: { marginTop: SPACING.xs },
  scenarioGrid: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  scenarioHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  scenarioValue: { marginTop: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  sectionTitle: { marginBottom: SPACING.md },
  targetChip: {
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: TOUCH_TARGET,
  },
  targetResult: { lineHeight: 20, marginTop: SPACING.md },
  targetRow: { flexDirection: 'row', gap: SPACING.md },
  trendCard: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  weightBadge: { borderRadius: RADIUS.xs, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
});
