import { Course } from '../utils/gpa-calculator';
import { Assignment } from '../utils/task-manager';
import { ClassPeriod, TranscriptEntry, AttendanceRecord } from '../utils/schedule-data';
import { logError, logWarning } from '../utils/error-logger';

const BASE_URL = 'https://gradient-hac-api.vercel.app/api';

// defensive validation helpers to prevent crashes from malformed API responses
function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function safeString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function safeNumber(val: unknown, fallback = NaN): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// parse user-friendly error messages from HAC API responses
class HACError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'HACError';
  }
}

function parseAPIError(status: number, endpoint: string): string {
  if (status === 401 || status === 403) {
    return 'Invalid credentials. Please log in again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status === 500 || status === 502 || status === 503) {
    return 'District server is temporarily unavailable. Try again later.';
  }
  if (status === 404) {
    return `Data not available for ${endpoint}.`;
  }
  return `Unable to load ${endpoint}. Check your connection.`;
}

async function apiFetch(endpoint: string, hacUrl: string, username: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: hacUrl, user: username, pass: password }),
    });
    if (!res.ok) {
      throw new HACError(parseAPIError(res.status, endpoint), res.status);
    }
    const data = await res.json();
    // validate response is at least an object or array
    if (!data || (typeof data !== 'object')) {
      throw new HACError(`Invalid response from ${endpoint}`);
    }
    return data;
  } catch (e) {
    if (e instanceof HACError) throw e;
    // network errors
    if (e instanceof TypeError && e.message.includes('fetch')) {
      const networkError = new HACError('No internet connection. Please check your network.');
      logWarning('Network error in apiFetch', { endpoint, error: (e as Error).message });
      throw networkError;
    }
    const sanitized = (e as Error).message.replace(/pass=[^&\s]*/gi, 'pass=***');
    const wrappedError = new HACError(`Failed to load ${endpoint}: ${sanitized}`);
    logError(new Error(sanitized), { endpoint });
    throw wrappedError;
  }
}

// shared base keeps className() type-safe without any casts
interface WithRawClassName {
  class?: string;
  className?: string;
}

interface RawAverage extends WithRawClassName {
  grade?: string;  // "87.50" or "--" when ungraded
  teacher?: string;
  room?: string;
  period?: string | number;
}

interface RawAssignment {
  name?: string;
  category?: string;
  dateDue?: string;
  date?: string;
  score?: string | number;  // "95 / 100", "95", or 95
  totalPoints?: string | number;
}

interface RawClassAssignments extends WithRawClassName {
  grades?: RawAssignment[];
  assignments?: RawAssignment[];
}

interface RawScheduleClass extends WithRawClassName {
  teacher?: string;
  room?: string;
  period?: string | number;
  daysOfWeek?: string;
  days?: string;
}

interface RawTranscriptCourse {
  name?: string;
  courseName?: string;
  grade?: string;
  credits?: string | number;
  earnedCredits?: string | number;
  semester?: string;
}

interface RawTranscriptYear {
  year?: string;
  courses?: RawTranscriptCourse[];
}

function rawClassName(raw: WithRawClassName): string {
  return safeString(raw.className || raw.class, 'Unknown');
}

// parse "87.50", "--", or a number → float; NaN when ungraded
function parseGrade(val: string | number | undefined): number {
  if (val === undefined || val === '--' || val === '') return NaN;
  return typeof val === 'number' ? val : parseFloat(String(val));
}

// parse "95 / 100" → 95, or a plain number
function parseScore(val: string | number | undefined): number {
  if (val === undefined) return NaN;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).split('/')[0].trim());
}

// normalize array-or-wrapped API response with validation
function toArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isObject(raw)) {
    for (const key of ['classes', 'grades', 'assignments', 'transcript', 'data']) {
      const v = raw[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function gradeColor(avg: number): string {
  if (avg >= 90) return '#10B981';
  if (avg >= 80) return '#3B82F6';
  if (avg >= 70) return '#F59E0B';
  return '#EF4444';
}

// AP/Honors prefix → weighted GPA multiplier
function inferWeight(name: string): number {
  const u = name.toUpperCase();
  if (u.startsWith('AP ') || u.includes(' AP ')) return 1.1;
  if (u.includes('HONORS') || u.includes('HON ')) return 1.05;
  return 1.0;
}

// default bell schedule; HAC provides period numbers but not clock times
const BELL_TIMES: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '08:00', endTime: '08:50' },
  2: { startTime: '09:00', endTime: '09:50' },
  3: { startTime: '10:00', endTime: '10:50' },
  4: { startTime: '11:00', endTime: '11:50' },
  5: { startTime: '12:30', endTime: '13:20' },
  6: { startTime: '13:30', endTime: '14:20' },
  7: { startTime: '14:30', endTime: '15:20' },
  8: { startTime: '15:30', endTime: '16:20' },
};

// shared fetch so fetchSchedule + fetchTeachers don't make two identical calls
async function fetchRawClasses(hacUrl: string, username: string, password: string) {
  return toArray(await apiFetch('classes', hacUrl, username, password));
}

function gradeLetterToPoints(grade: string): number {
  const map: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  };
  return map[grade.trim()] ?? 0;
}

function normalizeAttendanceStatus(raw: string): AttendanceRecord['status'] {
  const s = raw.toLowerCase();
  if (s.includes('absent') || s === 'a') return 'absent';
  if (s.includes('tardy') || s === 't') return 'tardy';
  if (s.includes('excused') || s === 'e') return 'excused';
  return 'present';
}

export interface GradeEntry {
  className: string;
  average: number;  // NaN if ungraded
  color: string;
  teacher: string;
  room: string;
  period: string;
  categories: { name: string; grade: string; color: string }[];
}

export async function fetchGrades(
  hacUrl: string, username: string, password: string
): Promise<GradeEntry[]> {
  const raw = await apiFetch('averages', hacUrl, username, password);
  return toArray(raw)
    .filter((item): item is RawAverage => isObject(item))
    .map((item) => {
      const avg = parseGrade(item.grade);
      return {
        className: rawClassName(item),
        average: avg,
        color: gradeColor(avg),
        teacher: safeString(item.teacher),
        room: safeString(item.room),
        period: String(item.period ?? ''),
        categories: [],
      };
    })
    .filter((g) => !isNaN(g.average));
}

export async function fetchAssignments(
  hacUrl: string, username: string, password: string
): Promise<Assignment[]> {
  const raw = await apiFetch('assignments', hacUrl, username, password);
  const results: Assignment[] = [];

  toArray(raw)
    .filter((cls): cls is RawClassAssignments => isObject(cls))
    .forEach((cls) => {
      const name = rawClassName(cls);
      const list: RawAssignment[] = cls.grades ?? cls.assignments ?? [];
      list.filter((a): a is RawAssignment => isObject(a)).forEach((a, i) => {
        const score = parseScore(a.score);
        const total = parseScore(a.totalPoints);
        results.push({
          id: `hac-${name}-${i}`,
          title: safeString(a.name, 'Assignment'),
          dueDate: safeString(a.dateDue || a.date, new Date().toISOString().slice(0, 10)),
          class: name,
          description: safeString(a.category),
          points: isNaN(total) ? undefined : total,
          category: safeString(a.category),
          completed: !isNaN(score),
          source: 'hac',
        });
      });
    });

  return results;
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

// accepts pre-fetched raw classes to avoid a second /classes call
export async function fetchSchedule(
  hacUrl: string, username: string, password: string,
  rawClasses?: unknown[]
): Promise<ClassPeriod[]> {
  const classes = rawClasses ?? await fetchRawClasses(hacUrl, username, password);
  return classes
    .filter((cls): cls is RawScheduleClass => isObject(cls))
    .map((cls, i) => {
      const periodNum = parseInt(String(cls.period ?? i + 1), 10) || i + 1;
      const times = BELL_TIMES[periodNum] ?? BELL_TIMES[1];
      return {
        id: String(periodNum),
        name: rawClassName(cls),
        teacher: safeString(cls.teacher),
        room: safeString(cls.room),
        startTime: times.startTime,
        endTime: times.endTime,
        credits: 1,
        dayType: 'all' as const,
      };
    });
}

export async function fetchTranscript(
  hacUrl: string, username: string, password: string
): Promise<TranscriptEntry[]> {
  const raw = await apiFetch('transcript', hacUrl, username, password);
  const entries: TranscriptEntry[] = [];

  toArray(raw)
    .filter((yearBlock): yearBlock is RawTranscriptYear => isObject(yearBlock))
    .forEach((yearBlock) => {
      const year = safeString(yearBlock.year, 'Unknown');
      const courses = Array.isArray(yearBlock.courses) ? yearBlock.courses : [];
      courses.filter((c): c is RawTranscriptCourse => isObject(c)).forEach((c) => {
        const grade = safeString(c.grade);
        entries.push({
          course: safeString(c.courseName || c.name, 'Unknown'),
          year,
          semester: safeString(c.semester, 'Full Year'),
          credits: safeNumber(c.earnedCredits ?? c.credits, 4),
          grade,
          gradePoints: gradeLetterToPoints(grade),
        });
      });
    });

  return entries;
}

export async function fetchAttendance(
  hacUrl: string, username: string, password: string
): Promise<AttendanceRecord[]> {
  let raw: unknown;
  try {
    raw = await apiFetch('report-card', hacUrl, username, password);
  } catch (e) {
    logWarning('attendance unavailable', { error: (e as Error).message });
    return [];
  }
  const list: unknown[] = (isObject(raw) && Array.isArray(raw.attendance)) ? raw.attendance : toArray(raw);

  return list
    .filter((r): r is { date: unknown; status: unknown; reason?: unknown } => 
      isObject(r) && !!r.date && !!r.status
    )
    .map((r) => ({
      date: safeString(r.date),
      status: normalizeAttendanceStatus(safeString(r.status)),
      reason: safeString(r.reason),
    }));
}

// accepts pre-fetched raw classes to avoid a second /classes call
export async function fetchTeachers(
  hacUrl: string, username: string, password: string,
  rawClasses?: unknown[]
): Promise<{ id: string; name: string; email: string; class: string; room: string }[]> {
  const classes = rawClasses ?? await fetchRawClasses(hacUrl, username, password);
  return classes
    .filter((cls): cls is RawScheduleClass => isObject(cls))
    .map((cls, i) => ({
      id: String(i + 1),
      name: safeString(cls.teacher),
      email: '',
      class: rawClassName(cls),
      room: safeString(cls.room),
    }))
    .filter((t) => t.name !== '');
}
