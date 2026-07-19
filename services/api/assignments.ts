import { Assignment } from '../../utils/task-manager';
import { apiFetch, isObject, safeString } from './client';
import { parseScore } from './parsers';

// /assignments returns { "Class Name": { average, assignments: [][]string, categories: [][]string } }
interface RawClassAssignments {
  average?: string;
  assignments?: string[][]; // rows: [dateDue, dateAssigned, name, category, score, totalPoints, ...]
  categories?: string[][];
}

export async function fetchAssignments(
  hacUrl: string, username: string, password: string
): Promise<Assignment[]> {
  const raw = await apiFetch('assignments', hacUrl, username, password);
  if (!isObject(raw)) return [];
  const results: Assignment[] = [];

  Object.entries(raw)
    .filter((entry): entry is [string, RawClassAssignments] => isObject(entry[1]))
    .forEach(([name, cls]) => {
      const rows = Array.isArray(cls.assignments) ? cls.assignments : [];
      rows
        .filter((row): row is string[] => Array.isArray(row) && row.length >= 6)
        .forEach((row, i) => {
          const score = parseScore(row[4]);
          const total = parseScore(row[5]);
          results.push({
            id: `hac-${name}-${i}`,
            title: safeString(row[2], 'Assignment'),
            dueDate: safeString(row[0], new Date().toISOString().slice(0, 10)),
            class: name,
            description: safeString(row[3]),
            score: isNaN(score) ? undefined : score,
            points: isNaN(total) ? undefined : total,
            category: safeString(row[3]),
            completed: !isNaN(score),
            source: 'hac',
          });
        });
    });

  return results;
}
