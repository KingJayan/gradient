import { calculateGPA, whatIfScenario, Course } from '../gpa-calculator';

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
});

describe('whatIfScenario', () => {
  it('overrides grades for matched courses only', () => {
    const courses = [course('a', 70), course('b', 70)];
    const r = whatIfScenario(courses, [{ courseId: 'a', mockGrade: 95 }]);
    const baseline = calculateGPA(courses);
    expect(r.unweighted).toBeGreaterThan(baseline.unweighted);
  });
});
