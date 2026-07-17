/* eslint-disable react-native/no-color-literals, react-native/no-inline-styles */
// grade letter colors (#3B82F6 for B, etc.) + modal overlays intentionally hardcoded for data visualization
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateGPA, Course, GPAResult, GradeScale, whatIfScenario } from '../utils/gpa-calculator';
import { useTheme } from '../hooks/use-theme';
import { useDataCache } from '../context/data-context';
import { useFocusEffect } from '@react-navigation/native';

const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { label: 'A+', minGrade: 97, maxGrade: 100, points: 4.0 },
  { label: 'A',  minGrade: 93, maxGrade: 96,  points: 4.0 },
  { label: 'A-', minGrade: 90, maxGrade: 92,  points: 3.7 },
  { label: 'B+', minGrade: 87, maxGrade: 89,  points: 3.3 },
  { label: 'B',  minGrade: 83, maxGrade: 86,  points: 3.0 },
  { label: 'B-', minGrade: 80, maxGrade: 82,  points: 2.7 },
  { label: 'C+', minGrade: 77, maxGrade: 79,  points: 2.3 },
  { label: 'C',  minGrade: 73, maxGrade: 76,  points: 2.0 },
  { label: 'C-', minGrade: 70, maxGrade: 72,  points: 1.7 },
  { label: 'D',  minGrade: 60, maxGrade: 69,  points: 1.0 },
  { label: 'F',  minGrade: 0,  maxGrade: 59,  points: 0.0 },
];

export default function GPACalculatorScreen() {
  const { currentTheme } = useTheme();
  const { cache, loadGradesAndCourses } = useDataCache();
  const [courses, setCourses] = useState<Course[]>([]);
  const [gpaResult, setGPAResult] = useState<GPAResult | null>(null);
  const [mockScenario, setMockScenario] = useState<{ courseId: string; mockGrade: number }[]>([]);
  const [scenarioGPA, setScenarioGPA] = useState<GPAResult | null>(null);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [mockGradeInput, setMockGradeInput] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadGradesAndCourses();
    }, [loadGradesAndCourses])
  );

  useEffect(() => {
    if (cache.courses) setCourses(cache.courses);
  }, [cache.courses]);

  useEffect(() => {
    if (courses.length > 0) {
      setGPAResult(calculateGPA(courses, DEFAULT_GRADE_SCALE));
    }
  }, [courses]);

  useEffect(() => {
    setScenarioGPA(
      mockScenario.length > 0 ? whatIfScenario(courses, mockScenario, DEFAULT_GRADE_SCALE) : null
    );
  }, [mockScenario, courses]);

  const handleToggleCourseExclusion = (courseId: string) => {
    setCourses(courses.map((c) => (c.id === courseId ? { ...c, excluded: !c.excluded } : c)));
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

  if (cache.loading || !gpaResult) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Current GPA</Text>
        <View style={styles.gpaGrid}>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text style={styles.gpaLabel}>Weighted</Text>
            <Text style={styles.gpaValue}>{gpaResult.weighted}</Text>
          </View>
          <View style={[styles.gpaCard, { backgroundColor: currentTheme.primary }]}>
            <Text style={styles.gpaLabel}>Unweighted</Text>
            <Text style={styles.gpaValue}>{gpaResult.unweighted}</Text>
          </View>
        </View>
        <Text style={[styles.courseCount, { color: currentTheme.textSecondary }]}>
          {gpaResult.courseCount} courses · {gpaResult.totalCredits} credits
        </Text>
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
                <TouchableOpacity onPress={() => handleToggleCourseExclusion(course.id)}>
                  <Ionicons name={course.excluded ? 'eye-off' : 'eye'} size={20} color={course.excluded ? currentTheme.textSecondary : currentTheme.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.gradeRow}>
                <Text style={[styles.gradeLabel, { color: currentTheme.primary }]}>Current: {course.grade.toFixed(1)}%</Text>
                {mockGrade !== undefined && (
                  <Text style={styles.mockLabel}>Mock: {mockGrade}%</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.whatIfButton}
                onPress={() => { setSelectedCourseId(course.id); setShowWhatIf(true); }}
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
            <TouchableOpacity onPress={() => setMockScenario([])}>
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

      <Modal visible={showWhatIf} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>What-If Calculator</Text>
              <TouchableOpacity onPress={() => { setShowWhatIf(false); setSelectedCourseId(null); setMockGradeInput(''); }}>
                <Ionicons name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
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
                />
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={handleAddMockGrade}>
                  <Text style={styles.modalButtonText}>Add to Scenario</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  clearButton: { color: '#ff4444', fontSize: 12, fontWeight: '600' },
  container: { flex: 1 },
  courseCard: { borderRadius: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12 },
  courseCount: { fontSize: 12, textAlign: 'center' },
  courseCredits: { fontSize: 12, marginTop: 4 },
  courseHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 16, fontWeight: '600' },
  gpaCard: { alignItems: 'center', borderRadius: 8, flex: 1, paddingHorizontal: 12, paddingVertical: 16 },
  gpaGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gpaLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  gpaValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 8 },
  gradeLabel: { fontSize: 14, fontWeight: '600' },
  gradeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mockLabel: { color: '#DD00FF', fontSize: 14, fontWeight: '600' },
  modalButton: { alignItems: 'center', borderRadius: 8, paddingVertical: 14 },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingVertical: 20 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalInput: { borderRadius: 8, fontSize: 16, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 12 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  scenarioCard: { alignItems: 'center', borderRadius: 8, borderWidth: 2, flex: 1, paddingHorizontal: 12, paddingVertical: 16 },
  scenarioDelta: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  scenarioGrid: { flexDirection: 'row', gap: 12 },
  scenarioHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  scenarioLabel: { fontSize: 12, fontWeight: '600' },
  scenarioValue: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  whatIfButton: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  whatIfButtonText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
});
