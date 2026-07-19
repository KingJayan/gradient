export interface ClassPeriod {
  id: string;
  name: string;
  teacher: string;
  room: string;
}

export interface TranscriptEntry {
  course: string;
  year: string;
  semester: string;
  credits: number;
  grade: string;
  gradePoints: number;
}

