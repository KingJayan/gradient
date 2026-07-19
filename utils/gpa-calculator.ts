export interface Course {
  id: string;
  name: string;
  credits: number;
  grade: number;
  weight: number;
  excluded: boolean;
}

export interface GPAResult {
  weighted: number;
  unweighted: number;
  courseCount: number;
  totalCredits: number;
}

export interface GradeScale {
  label: string;
  minGrade: number;
  maxGrade: number;
  points: number;
}

export const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { label: 'A+', minGrade: 97, maxGrade: 100, points: 4.0 },
  { label: 'A', minGrade: 93, maxGrade: 96, points: 4.0 },
  { label: 'A-', minGrade: 90, maxGrade: 92, points: 3.7 },
  { label: 'B+', minGrade: 87, maxGrade: 89, points: 3.3 },
  { label: 'B', minGrade: 83, maxGrade: 86, points: 3.0 },
  { label: 'B-', minGrade: 80, maxGrade: 82, points: 2.7 },
  { label: 'C+', minGrade: 77, maxGrade: 79, points: 2.3 },
  { label: 'C', minGrade: 73, maxGrade: 76, points: 2.0 },
  { label: 'C-', minGrade: 70, maxGrade: 72, points: 1.7 },
  { label: 'D+', minGrade: 67, maxGrade: 69, points: 1.3 },
  { label: 'D', minGrade: 60, maxGrade: 66, points: 1.0 },
  { label: 'F', minGrade: 0, maxGrade: 59, points: 0.0 },
];

function getGradePoints(
  grade: number,
  scale: GradeScale[] = DEFAULT_GRADE_SCALE
): number {
  const sorted = scale.slice().sort((a, b) => b.minGrade - a.minGrade);
  return sorted.find((g) => grade >= g.minGrade)?.points ?? 0;
}

export function calculateGPA(
  courses: Course[],
  gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE
): GPAResult {
  const activeCourses = courses.filter((c) => !c.excluded);

  let totalWeightedPoints = 0;
  let totalCredits = 0;

  activeCourses.forEach((course) => {
    const gradePoints = getGradePoints(course.grade, gradeScale);
    totalWeightedPoints += (gradePoints + course.weight) * course.credits;
    totalCredits += course.credits;
  });

  const weightedGPA = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0;

  let totalUnweightedPoints = 0;
  activeCourses.forEach((course) => {
    totalUnweightedPoints += getGradePoints(course.grade, gradeScale);
  });

  const unweightedGPA =
    activeCourses.length > 0
      ? totalUnweightedPoints / activeCourses.length
      : 0;

  return {
    weighted: Math.round(weightedGPA * 100) / 100,
    unweighted: Math.round(unweightedGPA * 100) / 100,
    courseCount: activeCourses.length,
    totalCredits: activeCourses.reduce((sum, c) => sum + c.credits, 0),
  };
}

export function predictedGradeNeeded(
  targetGPA: number,
  remainingCourses: Course[],
  completedCourses: Course[] = [],
  gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE
): number {
  if (remainingCourses.length === 0) return 0;

  const completedActive = completedCourses.filter((c) => !c.excluded);
  const remainingActive = remainingCourses.filter((c) => !c.excluded);

  let completedPoints = 0;
  let completedCredits = 0;
  completedActive.forEach((c) => {
    completedPoints += (getGradePoints(c.grade, gradeScale) + c.weight) * c.credits;
    completedCredits += c.credits;
  });

  let remainingCredits = 0;
  let remainingBonusPoints = 0;
  remainingActive.forEach((c) => {
    remainingCredits += c.credits;
    remainingBonusPoints += c.weight * c.credits;
  });

  if (remainingCredits === 0) return 0;

  const totalCredits = completedCredits + remainingCredits;
  const needed = targetGPA * totalCredits - completedPoints;
  const requiredAvgPoints = (needed - remainingBonusPoints) / remainingCredits;

  if (requiredAvgPoints <= 0) return 0;
  if (requiredAvgPoints > 4.0) return 101;

  for (let grade = 0; grade <= 100; grade++) {
    if (getGradePoints(grade, gradeScale) >= requiredAvgPoints) return grade;
  }
  return 101;
}

export function whatIfScenario(
  courses: Course[],
  mockGrades: { courseId: string; mockGrade: number }[],
  gradeScale: GradeScale[] = DEFAULT_GRADE_SCALE
): GPAResult {
  const scenarioCourses = courses.map((course) => {
    const mock = mockGrades.find((m) => m.courseId === course.id);
    return mock ? { ...course, grade: mock.mockGrade } : course;
  });

  return calculateGPA(scenarioCourses, gradeScale);
}
