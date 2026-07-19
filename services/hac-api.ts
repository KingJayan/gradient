import { Course } from '../utils/gpa-calculator';
import { Assignment } from '../utils/task-manager';
import { ClassPeriod, TranscriptEntry } from '../utils/schedule-data';
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
    const wrappedError = new HACError(`Failed to load ${endpoint}`);
    logError(e as Error, { endpoint });
    throw wrappedError;
  }
}

// /assignments returns { "Class Name": { average, assignments: [][]string, categories: [][]string } }
interface RawClassAssignments {
  average?: string;
  assignments?: string[][];  // rows: [dateDue, dateAssigned, name, category, score, totalPoints, ...]
  categories?: string[][];
}

// row parsed out of /reportcard's { headers, data } table
interface ReportCardClass {
  className: string;
  teacher: string;
  room: string;
  period: string;
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

// AP/Honors prefix → weighted GPA multiplier
function inferWeight(name: string): number {
  const u = name.toUpperCase();
  if (u.startsWith('AP ') || u.includes(' AP ')) return 1.0;
  if (u.includes('HONORS') || u.includes('HON ')) return 0.5;
  return 0.0;
}


async function fetchRawClasses(
  hacUrl: string, username: string, password: string
): Promise<ReportCardClass[]> {
  const raw = await apiFetch('reportcard', hacUrl, username, password);
  if (!isObject(raw) || !Array.isArray(raw.data)) return [];
  const headers: string[] = Array.isArray(raw.headers) ? raw.headers.map((h) => safeString(h)) : [];
  const col = (name: string, fallback: number) => {
    const i = headers.indexOf(name);
    return i >= 0 ? i : fallback;
  };
  const nameIdx = col('Description', 1);
  const periodIdx = col('Period', 2);
  const teacherIdx = col('Teacher', 3);
  const roomIdx = col('Room', 4);
  return raw.data
    .filter((row): row is string[] => Array.isArray(row) && row.length > roomIdx)
    .map((row) => ({
      className: safeString(row[nameIdx], 'Unknown').trim(),
      teacher: safeString(row[teacherIdx]).trim(),
      room: safeString(row[roomIdx]).trim(),
      period: safeString(row[periodIdx]).trim(),
    }))
    .filter((c) => c.className !== '');
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

export interface GradeEntry {
  className: string;
  average: number;  // NaN if ungraded
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
        teacher: '',  // not exposed by /averages; schedule/teachers use /reportcard
        room: '',
        period: '',
        categories: [],
      };
    })
    .filter((g) => !isNaN(g.average));
}

export async function fetchAssignments(
  hacUrl: string, username: string, password: string
): Promise<Assignment[]> {
  // /assignments returns { "Class Name": { average, assignments: [][]string, categories } }
  // where each assignment row is [dateDue, dateAssigned, name, category, score, totalPoints, ...]
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

// accepts pre-fetched raw classes to avoid a second /reportcard call
export async function fetchSchedule(
  hacUrl: string, username: string, password: string,
  rawClasses?: ReportCardClass[]
): Promise<ClassPeriod[]> {
  const classes = rawClasses ?? await fetchRawClasses(hacUrl, username, password);
  return classes
    .map((cls, i) => {
      const periodNum = parseInt(cls.period, 10) || i + 1;
      return {
        id: String(periodNum),
        name: cls.className,
        teacher: cls.teacher,
        room: cls.room,
        startTime: '',
        endTime: '',
        credits: 1,
        dayType: 'all' as const,
      };
    });
}

export async function fetchTranscript(
  hacUrl: string, username: string, password: string
): Promise<TranscriptEntry[]> {
  const raw = await apiFetch('transcript', hacUrl, username, password);
  if (!isObject(raw)) return [];
  const entries: TranscriptEntry[] = [];

  Object.values(raw)
    .filter((block): block is Record<string, unknown> => isObject(block) && Array.isArray(block.data))
    .forEach((block) => {
      const year = safeString(block.year, 'Unknown');
      const semester = safeString(block.semester, 'Full Year');
      const rows = (block.data as unknown[]).filter((r): r is string[] => Array.isArray(r));
      if (rows.length === 0) return;
      const header = rows[0].map((h) => safeString(h).trim().toLowerCase());
      const col = (name: string, fallback: number) => {
        const i = header.indexOf(name);
        return i >= 0 ? i : fallback;
      };
      const descIdx = col('description', 1);
      const gradeIdx = col('grade', 2);
      const creditIdx = col('credit', 3);
      rows.slice(1).forEach((row) => {
        if (row.length <= Math.max(descIdx, gradeIdx)) return;
        const grade = safeString(row[gradeIdx]).trim();
        entries.push({
          course: safeString(row[descIdx], 'Unknown').trim(),
          year,
          semester,
          credits: safeNumber(row[creditIdx], 0),
          grade,
          gradePoints: gradeLetterToPoints(grade),
        });
      });
    });

  return entries;
}

