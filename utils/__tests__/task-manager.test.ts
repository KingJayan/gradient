import { mergeTasks, getOverdueTasks, groupByDate, Assignment, PersonalTask } from '../task-manager';

const hacTask = (id: string, dueDate: string, completed = false): Assignment => ({
  id, title: id, dueDate, class: 'Math', completed, source: 'hac',
});

const personalTask = (id: string, dueDate: string, completed = false): PersonalTask => ({
  id, title: id, dueDate, completed, priority: 'medium',
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
