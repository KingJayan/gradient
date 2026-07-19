import { fetchGrades, fetchCourses, fetchAssignments, fetchTranscript, GradeEntry } from '../hac-api';

const mockFetch = (data: unknown, status = 200) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => data });

const gradeEntry = (className: string, average: number): GradeEntry => ({
  className, average, teacher: '', room: '', period: '', categories: [],
});

beforeEach(() => { jest.restoreAllMocks(); });

describe('fetchGrades', () => {
  it('parses numeric averages and filters ungraded ("--") entries', async () => {
    global.fetch = mockFetch({ Math: '87.50', English: '--', Science: '95' });
    const grades = await fetchGrades('http://hac.test', 'user', 'pass');
    expect(grades).toHaveLength(2);
    expect(grades.find((g) => g.className === 'Math')?.average).toBeCloseTo(87.5);
    expect(grades.find((g) => g.className === 'Science')?.average).toBe(95);
    expect(grades.find((g) => g.className === 'English')).toBeUndefined();
  });

  it('returns empty array for non-object response', async () => {
    global.fetch = mockFetch([]);
    const grades = await fetchGrades('', '', '');
    expect(grades).toEqual([]);
  });

  it('throws with user-friendly message on 401', async () => {
    global.fetch = mockFetch(null, 401);
    await expect(fetchGrades('', '', '')).rejects.toThrow('Invalid credentials');
  });

  it('throws with user-friendly message on 500', async () => {
    global.fetch = mockFetch(null, 500);
    await expect(fetchGrades('', '', '')).rejects.toThrow('temporarily unavailable');
  });
});

describe('fetchCourses', () => {
  it('maps grades to courses with inferred weights', async () => {
    const grades = [
      gradeEntry('AP Chemistry', 92),
      gradeEntry('HONORS English', 88),
      gradeEntry('Math III', 85),
    ];
    const courses = await fetchCourses('', '', '', grades);
    expect(courses).toHaveLength(3);
    expect(courses[0].weight).toBe(1.0);
    expect(courses[1].weight).toBe(0.5);
    expect(courses[2].weight).toBe(0.0);
  });

  it('assigns credits=4 and excluded=false to all courses', async () => {
    const courses = await fetchCourses('', '', '', [gradeEntry('Math', 90)]);
    expect(courses[0].credits).toBe(4);
    expect(courses[0].excluded).toBe(false);
  });
});

describe('fetchAssignments', () => {
  it('parses assignment rows into typed Assignment objects', async () => {
    global.fetch = mockFetch({
      Math: {
        assignments: [
          ['2026-08-01', '2026-07-25', 'Homework 1', 'Classwork', '95', '100'],
          ['2026-08-05', '2026-07-30', 'Quiz 1', 'Tests', '--', '50'],
        ],
      },
    });
    const assignments = await fetchAssignments('', '', '');
    expect(assignments).toHaveLength(2);
    expect(assignments[0].title).toBe('Homework 1');
    expect(assignments[0].score).toBe(95);
    expect(assignments[0].completed).toBe(true);
    expect(assignments[0].source).toBe('hac');
    expect(assignments[1].score).toBeUndefined();
    expect(assignments[1].completed).toBe(false);
  });

  it('parses "score / total" format correctly', async () => {
    global.fetch = mockFetch({
      English: {
        assignments: [['2026-08-01', '2026-07-25', 'Essay', 'Writing', '48 / 50', '50']],
      },
    });
    const [a] = await fetchAssignments('', '', '');
    expect(a.score).toBe(48);
    expect(a.points).toBe(50);
  });

  it('returns empty array when response is not an object map', async () => {
    global.fetch = mockFetch([]);
    const result = await fetchAssignments('', '', '');
    expect(result).toEqual([]);
  });
});

describe('fetchTranscript', () => {
  it('parses transcript blocks into TranscriptEntry objects with gradePoints', async () => {
    global.fetch = mockFetch({
      block1: {
        year: '2024-2025',
        semester: 'Full Year',
        data: [
          ['#', 'description', 'grade', 'credit'],
          ['1', 'AP Chemistry', 'A', '1'],
          ['2', 'English III', 'B+', '1'],
        ],
      },
    });
    const entries = await fetchTranscript('', '', '');
    expect(entries).toHaveLength(2);
    expect(entries[0].course).toBe('AP Chemistry');
    expect(entries[0].grade).toBe('A');
    expect(entries[0].gradePoints).toBe(4.0);
    expect(entries[0].year).toBe('2024-2025');
    expect(entries[1].gradePoints).toBe(3.3);
  });

  it('returns empty array when response has no valid blocks', async () => {
    global.fetch = mockFetch({});
    expect(await fetchTranscript('', '', '')).toEqual([]);
  });
});
