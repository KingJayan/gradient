export const STATUS = {
  positive: '#22C55E',
  info: '#3B82F6',
  warning: '#F59E0B',
  caution: '#FF8844',
  danger: '#EF4444',
  dangerMuted: '#F87171',
} as const;

export const UI_COLORS = {
  info: STATUS.info,
  warning: STATUS.warning,
  danger: STATUS.danger,
  dangerMuted: STATUS.dangerMuted,
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const BRAND = {
  primary: '#00F5A0',
  background: '#060F0B',
  textSecondary: '#6B9E85',
} as const;

export const FALLBACK = {
  primary: '#00F5A0',
  background: '#0A0A0A',
  text: '#FFFFFF',
  textSecondary: '#999999',
} as const;

export function gradeLetter(avg: number): string {
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  return 'F';
}

export function gradeColorFromLetter(grade: string): string {
  if (grade.startsWith('A')) return STATUS.positive;
  if (grade.startsWith('B')) return STATUS.info;
  if (grade.startsWith('C')) return STATUS.warning;
  if (grade.startsWith('D')) return STATUS.caution;
  return STATUS.danger;
}

export function gradeColor(avg: number): string {
  return gradeColorFromLetter(gradeLetter(avg));
}

export function onPrimary(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#111827' : '#FFFFFF';
}
