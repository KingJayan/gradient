import { mergeTasks, getOverdueTasks, getUpcomingTasks, groupByDate, generateTaskSummary, Assignment, PersonalTask } from '../task-manager';

const hacTask = (id: string, dueDate: string, completed = false): Assignment => ({
  id, title: id, dueDate, class: 'Math', completed, source: 'hac',
});

const personalTask = (id: string, dueDate: string, completed = false): PersonalTask => ({
  id, title: id, dueDate, completed, priority: 'medium', reminders: [],
});

describe('mergeTasks', () => {
  it('returns empty for empty inputs', () => {
    expect(mergeTasks([], [])).toEqual([]);
  });

  it('merges and sorts by dueDate ascending', () => {
    const result = mergeTasks(
      [hacTask('h1', '2026-08-01'), hacTask('h2', '2026-07-15')],
      [personalTask('p1', '2026-07-20')]
    );
    expect(result.map((t) => t.id)).toEqual(['h2', 'p1', 'h1']);
  });

  it('maps personal tasks to source=personal and class=Personal', () => {
    const result = mergeTasks([], [personalTask('p1', '2026-07-20')]);
    expect(result[0].source).toBe('personal');
    expect(result[0].class).toBe('Personal');
    expect(result[0].priority).toBe('medium');
  });
});

describe('getOverdueTasks', () => {
  it('returns only incomplete past tasks', () => {
    const tasks = [
      hacTask('past', '2024-01-01'),
      hacTask('future', '2030-01-01'),
      { ...hacTask('done', '2024-01-01'), completed: true },
    ];
    const result = getOverdueTasks(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('past');
  });

  it('returns empty when all tasks are in the future', () => {
    expect(getOverdueTasks([hacTask('future', '2030-01-01')])).toHaveLength(0);
  });
});

describe('getUpcomingTasks', () => {
  it('includes incomplete tasks within the default 7-day window', () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const far = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = getUpcomingTasks([hacTask('near', tomorrow), hacTask('far', far)]);
    expect(result.map((t) => t.id)).toContain('near');
    expect(result.map((t) => t.id)).not.toContain('far');
  });

  it('excludes completed tasks', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = getUpcomingTasks([{ ...hacTask('done', tomorrow), completed: true }]);
    expect(result).toHaveLength(0);
  });

  it('respects custom day window', () => {
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(getUpcomingTasks([hacTask('t', in10Days)], 5)).toHaveLength(0);
    expect(getUpcomingTasks([hacTask('t', in10Days)], 15)).toHaveLength(1);
  });
});

describe('groupByDate', () => {
  it('groups tasks sharing a date under the same key', () => {
    const tasks = [
      hacTask('a', '2026-08-01'),
      hacTask('b', '2026-08-01'),
      hacTask('c', '2026-08-02'),
    ];
    const grouped = groupByDate(tasks);
    expect(grouped.size).toBe(2);
    const values = Array.from(grouped.values());
    expect(values[0]).toHaveLength(2);
    expect(values[1]).toHaveLength(1);
  });
});

describe('generateTaskSummary', () => {
  it('tallies total, completed, overdue, and upcoming correctly', () => {
    const tasks = [
      hacTask('past', '2024-01-01'),
      { ...hacTask('done', '2024-01-01'), completed: true },
    ];
    const s = generateTaskSummary(tasks);
    expect(s.total).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.overdue).toBe(1);
  });
});
