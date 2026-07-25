import { apiFetch, isObject, safeString, safeNumber } from './client';
import { recordResponse } from './schema';
import { colIndex, gradeLetterToPoints } from './parsers';

export interface TranscriptEntry {
  course: string;
  year: string;
  semester: string;
  credits: number;
  grade: string;
  gradePoints: number;
}

export async function fetchTranscript(
  hacUrl: string, username: string, password: string, profileId?: string
): Promise<TranscriptEntry[]> {
  const raw = await apiFetch('transcript', hacUrl, username, password, recordResponse, undefined, profileId);
  const entries: TranscriptEntry[] = [];

  Object.values(raw)
    .filter((block): block is Record<string, unknown> => isObject(block) && Array.isArray(block.data))
    .forEach((block) => {
      const year = safeString(block.year, 'Unknown');
      const semester = safeString(block.semester, 'Full Year');
      const rows = (block.data as unknown[]).filter((r): r is string[] => Array.isArray(r));
      if (rows.length === 0) return;
      const header = rows[0].map((h) => safeString(h).trim().toLowerCase());
      const descIdx = colIndex(header, 'description', 1);
      const gradeIdx = colIndex(header, 'grade', 2);
      const creditIdx = colIndex(header, 'credit', 3);
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
