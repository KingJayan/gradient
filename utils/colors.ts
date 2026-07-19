export const UI_COLORS = {
  info: '#3B82F6',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

export function gradeColor(avg: number): string {
  if (avg >= 90) return '#22C55E';
  if (avg >= 80) return '#3B82F6';
  if (avg >= 70) return '#F59E0B';
  return '#EF4444';
}

export function gradeColorFromLetter(grade: string): string {
  if (grade.startsWith('A')) return '#22C55E';
  if (grade.startsWith('B')) return '#3B82F6';
  if (grade.startsWith('C')) return '#F59E0B';
  if (grade.startsWith('D')) return '#FF8844';
  return '#EF4444';
}

export function onPrimary(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#111827' : '#FFFFFF';
}
