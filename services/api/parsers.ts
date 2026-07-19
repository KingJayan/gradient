// parse "87.50", "--", or a number → float; NaN when ungraded
export function parseGrade(val: string | number | undefined): number {
  if (val === undefined || val === '--' || val === '') return NaN;
  return typeof val === 'number' ? val : parseFloat(String(val));
}

// parse "95 / 100" → 95, or a plain number
export function parseScore(val: string | number | undefined): number {
  if (val === undefined) return NaN;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).split('/')[0].trim());
}

// AP/Honors prefix → weighted GPA multiplier
export function inferWeight(name: string): number {
  const u = name.toUpperCase();
  if (u.startsWith('AP ') || u.includes(' AP ')) return 1.0;
  if (u.includes('HONORS') || u.includes('HON ')) return 0.5;
  return 0.0;
}

export function gradeLetterToPoints(grade: string): number {
  const map: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  };
  return map[grade.trim()] ?? 0;
}

// index of a named column in a header row, or fallback when absent
export function colIndex(headers: string[], name: string, fallback: number): number {
  const i = headers.indexOf(name);
  return i >= 0 ? i : fallback;
}
