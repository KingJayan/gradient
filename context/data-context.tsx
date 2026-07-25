import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useCreds, Creds } from '../hooks/use-creds';
import { useHacQuery, invalidateQuery, invalidateAllQueries } from '../hooks/use-hac-query';
import { fetchGrades, fetchCourses, GradeEntry } from '../services/api/grades';
import { fetchAssignments } from '../services/api/assignments';
import { fetchSchedule, ClassPeriod } from '../services/api/schedule';
import { Course } from '../utils/gpa-calculator';
import { Assignment } from '../utils/task-manager';
import { syncGradeNotifications } from '../services/notifications';
import { mark, measure } from '../utils/perf';

const DASHBOARD_KEY = 'dashboard';

interface Dashboard {
  grades: GradeEntry[];
  courses: Course[];
  assignments: Assignment[];
  schedule: ClassPeriod[];
}

export interface DataCache {
  grades: GradeEntry[] | null;
  courses: Course[] | null;
  assignments: Assignment[] | null;
  schedule: ClassPeriod[] | null;
  loading: boolean;
  error: string | null;
  updatedAt: number;
}

interface DataContextType {
  cache: DataCache;
  loadGradesAndCourses: () => Promise<void>;
  clearCache: () => void;
}

export const DASHBOARD_QUERY_KEY = DASHBOARD_KEY;

export async function fetchDashboard(creds: Creds, signal?: AbortSignal): Promise<Dashboard> {
  mark('dashboard:start');
  const { hacUrl, username, password, profileId } = creds;
  const [grades, assignments, schedule] = await Promise.all([
    fetchGrades(hacUrl, username, password, signal, profileId),
    fetchAssignments(hacUrl, username, password, signal, profileId),
    fetchSchedule(hacUrl, username, password, signal, profileId),
  ]);
  const courses = await fetchCourses(hacUrl, username, password, grades, signal, profileId);
  measure('dashboard', 'dashboard:start');
  return { grades, courses, assignments, schedule };
}

export const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const creds = useCreds();
  const query = useHacQuery<Dashboard>(
    creds ? DASHBOARD_KEY : null,
    (signal) => fetchDashboard(creds!, signal)
  );

  useEffect(() => {
    if (!creds) invalidateAllQueries();
  }, [creds]);

  const grades = query.data?.grades;
  useEffect(() => {
    if (grades) syncGradeNotifications(grades);
  }, [grades]);

  const cache: DataCache = {
    grades: query.data?.grades ?? null,
    courses: query.data?.courses ?? null,
    assignments: query.data?.assignments ?? null,
    schedule: query.data?.schedule ?? null,
    loading: query.loading,
    error: query.error,
    updatedAt: query.updatedAt,
  };

  const clearCache = useCallback(() => {
    invalidateQuery(DASHBOARD_KEY);
  }, []);

  return (
    <DataContext.Provider value={{ cache, loadGradesAndCourses: query.refetch, clearCache }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataProvider');
  }
  return context;
}
