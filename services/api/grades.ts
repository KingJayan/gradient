import { Course } from '../../utils/gpa-calculator';
import { apiFetch, isObject } from './client';
import { parseGrade, inferWeight } from './parsers';

export interface GradeEntry {
  className: string;
  average: number; // NaN if ungraded
  teacher: string;
  room: string;
  period: string;
  categories: { name: string; grade: string }[];
}

export async function fetchGrades(
  hacUrl: string, username: string, password: string
): Promise<GradeEntry[]> {
  // /averages returns a plain map: { "Class Name": "87.50" | "", ... }
  const raw = await apiFetch('averages', hacUrl, username, password);
  if (!isObject(raw)) return [];
  return Object.entries(raw)
    .map(([className, grade]) => {
      const avg = parseGrade(typeof grade === 'string' || typeof grade === 'number' ? grade : undefined);
      return {
        className,
        average: avg,
        teacher: '', // not exposed by /averages; schedule uses /reportcard
        room: '',
        period: '',
        categories: [],
      };
    })
    .filter((g) => !isNaN(g.average));
}

// accepts pre-fetched grades to avoid a second /averages call
export async function fetchCourses(
  hacUrl: string, username: string, password: string,
  grades?: GradeEntry[]
): Promise<Course[]> {
  const list = grades ?? await fetchGrades(hacUrl, username, password);
  return list.map((g, i) => ({
    id: String(i + 1),
    name: g.className,
    credits: 4,
    grade: g.average,
    weight: inferWeight(g.className),
    excluded: false,
  }));
}
