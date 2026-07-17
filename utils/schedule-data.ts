export interface ClassPeriod {
  id: string;
  name: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
  credits: number;
  dayType: 'A' | 'B' | 'all'; // for A/B day schedules
}

export interface TranscriptEntry {
  course: string;
  year: string;
  semester: string;
  credits: number;
  grade: string;
  gradePoints: number;
}

export interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'tardy' | 'excused';
  reason?: string;
}

export function calculateAttendancePercentage(
  records: AttendanceRecord[]
): number {
  if (records.length === 0) return 100;
  const presents = records.filter(
    (r) => r.status === 'present' || r.status === 'excused'
  ).length;
  return Math.round((presents / records.length) * 100);
}
