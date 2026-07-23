import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_KEYS } from './storage';
import { calculateGPA, Course } from './gpa-calculator';

export interface GradeSnapshot {
  at: number;
  averages: Record<string, number>;
}

export interface GradeChange {
  className: string;
  from: number;
  to: number;
}

const MAX_SNAPSHOTS = 40;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function loadGradeHistory(): Promise<GradeSnapshot[]> {
  const raw = await AsyncStorage.getItem(LOCAL_KEYS.gradeHistory);
  return raw ? (JSON.parse(raw) as GradeSnapshot[]) : [];
}

export async function recordGradeSnapshot(
  grades: { className: string; average: number }[]
): Promise<GradeChange[]> {
  const averages: Record<string, number> = {};
  grades.forEach((g) => {
    if (!isNaN(g.average)) averages[g.className] = round1(g.average);
  });

  const history = await loadGradeHistory();
  const last = history[history.length - 1];

  const changes: GradeChange[] = [];
  if (last) {
    for (const [className, to] of Object.entries(averages)) {
      const from = last.averages[className];
      if (from !== undefined && from !== to) changes.push({ className, from, to });
    }
  }

  const classesChanged =
    !last ||
    Object.keys(averages).length !== Object.keys(last.averages).length ||
    Object.keys(averages).some((c) => last.averages[c] !== averages[c]);

  if (classesChanged) {
    const next = [...history, { at: Date.now(), averages }].slice(-MAX_SNAPSHOTS);
    await AsyncStorage.setItem(LOCAL_KEYS.gradeHistory, JSON.stringify(next));
  }

  return changes;
}

export function classTrend(history: GradeSnapshot[], className: string): number[] {
  return history.map((s) => s.averages[className]).filter((v): v is number => v !== undefined);
}

export function gpaSeries(history: GradeSnapshot[], courses: Course[]): { at: number; gpa: number }[] {
  return history.map((snapshot) => {
    const projected = courses.map((c) => {
      const avg = snapshot.averages[c.name];
      return avg !== undefined ? { ...c, grade: avg } : c;
    });
    return { at: snapshot.at, gpa: calculateGPA(projected).weighted };
  });
}
