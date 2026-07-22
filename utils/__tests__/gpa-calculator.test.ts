import {
  calculateGPA,
  predictedGradeNeeded,
  whatIfScenario,
  Course,
  UNREACHABLE_GRADE,
} from '../gpa-calculator';

const course = (id: string, grade: number, credits = 4, weight = 0, excluded = false): Course => ({
  id, name: id, credits, weight, grade, excluded,
});

describe('calculateGPA', () => {
  it('returns zeros for empty input', () => {
    const r = calculateGPA([]);
    expect(r.weighted).toBe(0);
    expect(r.unweighted).toBe(0);
    expect(r.courseCount).toBe(0);
  });

  it('computes 4.0 for all A grades', () => {
    const r = calculateGPA([course('a', 95), course('b', 98)]);
    expect(r.unweighted).toBe(4.0);
    expect(r.weighted).toBe(4.0);
    expect(r.courseCount).toBe(2);
  });

  it('skips excluded courses', () => {
    const r = calculateGPA([course('a', 95), course('b', 50, 4, 1, true)]);
    expect(r.courseCount).toBe(1);
    expect(r.unweighted).toBe(4.0);
  });

  it('weighted differs from unweighted when course weight > 1', () => {
    const r = calculateGPA([course('a', 95, 4, 1.25), course('b', 75, 4, 1)]);
    expect(r.weighted).toBeGreaterThan(r.unweighted);
  });

  it.each([
    [89.5, 3.3],
    [92.5, 3.7],
    [96.5, 4.0],
  ])('gives %p, which falls in a gap between bands, the lower band points (%p)', (grade, points) => {
    expect(calculateGPA([course('a', grade)]).unweighted).toBe(points);
  });
});

describe('predictedGradeNeeded', () => {
  it('returns 0 when there are no remaining courses', () => {
    expect(predictedGradeNeeded(4.0, [])).toBe(0);
  });

  it('returns 0 when completed work already meets the target', () => {
    const completed = [course('a', 95), course('b', 95)];
    expect(predictedGradeNeeded(2.0, [course('c', 0)], completed)).toBe(0);
  });

  it('flags an unreachable target', () => {
    expect(predictedGradeNeeded(4.0, [course('c', 0)], [course('a', 50)])).toBe(UNREACHABLE_GRADE);
  });

  it('finds an achievable grade', () => {
    const g = predictedGradeNeeded(3.5, [course('b', 0)], [course('a', 85)]);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThanOrEqual(100);
  });

  it('accounts for course weight when solving the target', () => {
    const plain = predictedGradeNeeded(4.0, [course('a', 0)]);
    const weighted = predictedGradeNeeded(4.0, [course('a', 0, 4, 1)]);
    expect(weighted).toBeLessThan(plain);
  });
});

describe('whatIfScenario', () => {
  it('overrides grades for matched courses only', () => {
    const courses = [course('a', 70), course('b', 70)];
    const r = whatIfScenario(courses, [{ courseId: 'a', mockGrade: 95 }]);
    const baseline = calculateGPA(courses);
    expect(r.unweighted).toBeGreaterThan(baseline.unweighted);
  });
});
