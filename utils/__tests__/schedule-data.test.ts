import { calculateAttendancePercentage, AttendanceRecord } from '../schedule-data';

const rec = (status: AttendanceRecord['status']): AttendanceRecord => ({ date: '2026-01-01', status });

describe('calculateAttendancePercentage', () => {
  it('returns 100 for empty records', () => {
    expect(calculateAttendancePercentage([])).toBe(100);
  });

  it('counts present and excused as attending, absent and tardy as not', () => {
    const records = [rec('present'), rec('excused'), rec('absent'), rec('tardy')];
    expect(calculateAttendancePercentage(records)).toBe(50);
  });

  it('returns 100 when all records are present', () => {
    expect(calculateAttendancePercentage([rec('present'), rec('present')])).toBe(100);
  });

  it('returns 0 when all records are absent', () => {
    expect(calculateAttendancePercentage([rec('absent'), rec('absent')])).toBe(0);
  });
});
