import { fetchGrades, fetchCourses } from '../grades';
import { fetchAssignments } from '../assignments';
import { fetchSchedule } from '../schedule';
import { fetchTranscript } from '../transcript';
import { DEMO_CREDENTIALS } from '../demo';

const { username, password, hacUrl } = DEMO_CREDENTIALS;

beforeEach(() => {
  global.fetch = jest.fn(() => {
    throw new Error('demo mode must not hit the network');
  }) as unknown as typeof fetch;
});

describe('demo mode', () => {
  it('serves grades from fixtures without a request', async () => {
    const grades = await fetchGrades(hacUrl, username, password);
    expect(grades.length).toBeGreaterThan(0);
    expect(grades.every((g) => !isNaN(g.average))).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('derives weighted courses from the fixture class names', async () => {
    const courses = await fetchCourses(hacUrl, username, password);
    expect(courses.find((c) => c.name.startsWith('AP '))?.weight).toBe(1.0);
    expect(courses.find((c) => c.name.startsWith('Honors'))?.weight).toBe(0.5);
  });

  it('serves assignments with both graded and outstanding work', async () => {
    const assignments = await fetchAssignments(hacUrl, username, password);
    expect(assignments.some((a) => a.completed)).toBe(true);
    expect(assignments.some((a) => !a.completed)).toBe(true);
  });

  it('serves a schedule with a period, teacher, and room per class', async () => {
    const schedule = await fetchSchedule(hacUrl, username, password);
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule.every((c) => c.teacher !== '' && c.room !== '')).toBe(true);
  });

  it('serves a transcript with resolvable grade points', async () => {
    const entries = await fetchTranscript(hacUrl, username, password);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.credits === 1)).toBe(true);
    expect(entries[0].gradePoints).toBe(4.0);
  });

  it('leaves real accounts on the network path', async () => {
    await expect(fetchGrades(hacUrl, 'student', password)).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalled();
  });
});
