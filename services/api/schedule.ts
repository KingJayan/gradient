import { apiFetch, safeString } from './client';
import { tableResponse } from './schema';
import { colIndex } from './parsers';

export interface ClassPeriod {
  id: string;
  name: string;
  teacher: string;
  room: string;
}

// row parsed out of /reportcard's { headers, data } table
interface ReportCardClass {
  className: string;
  teacher: string;
  room: string;
  period: string;
}

async function fetchRawClasses(
  hacUrl: string, username: string, password: string, signal?: AbortSignal, profileId?: string
): Promise<ReportCardClass[]> {
  const table = await apiFetch('reportcard', hacUrl, username, password, tableResponse, signal, profileId);
  const headers = table.headers.map((h) => safeString(h));
  const nameIdx = colIndex(headers, 'Description', 1);
  const periodIdx = colIndex(headers, 'Period', 2);
  const teacherIdx = colIndex(headers, 'Teacher', 3);
  const roomIdx = colIndex(headers, 'Room', 4);
  return table.rows
    .filter((row): row is string[] => row.length > roomIdx)
    .map((row) => ({
      className: safeString(row[nameIdx], 'Unknown').trim(),
      teacher: safeString(row[teacherIdx]).trim(),
      room: safeString(row[roomIdx]).trim(),
      period: safeString(row[periodIdx]).trim(),
    }))
    .filter((c) => c.className !== '');
}

export async function fetchSchedule(
  hacUrl: string, username: string, password: string, signal?: AbortSignal, profileId?: string
): Promise<ClassPeriod[]> {
  const classes = await fetchRawClasses(hacUrl, username, password, signal, profileId);
  return classes.map((cls, i) => {
    const periodNum = parseInt(cls.period, 10) || i + 1;
    return {
      id: String(periodNum),
      name: cls.className,
      teacher: cls.teacher,
      room: cls.room,
    };
  });
}
