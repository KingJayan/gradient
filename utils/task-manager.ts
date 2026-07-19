export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  class: string;
  description?: string;
  score?: number;
  points?: number;
  category?: string;
  // carried through from PersonalTask so priority survives the merge
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  source: 'hac' | 'personal';
}

export interface PersonalTask {
  id: string;
  title: string;
  dueDate: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export function mergeTasks(
  hacAssignments: Assignment[],
  personalTasks: PersonalTask[]
): Assignment[] {
  const merged: Assignment[] = [
    ...hacAssignments,
    ...personalTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      class: 'Personal',
      description: task.description,
      priority: task.priority,
      completed: task.completed,
      source: 'personal' as const,
    })),
  ];

  return merged.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}

export function getOverdueTasks(tasks: Assignment[]): Assignment[] {
  const now = new Date();
  return tasks.filter(
    (task) => !task.completed && new Date(task.dueDate) < now
  );
}

export function groupByDate(tasks: Assignment[]): Map<string, Assignment[]> {
  const grouped = new Map<string, Assignment[]>();

  tasks.forEach((task) => {
    const dateStr = new Date(task.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, []);
    }
    grouped.get(dateStr)!.push(task);
  });

  return grouped;
}

