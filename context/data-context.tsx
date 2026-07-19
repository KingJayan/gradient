import React, { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import { useCreds } from '../hooks/use-creds';
import { fetchGrades, fetchCourses, fetchAssignments, fetchSchedule, GradeEntry } from '../services/hac-api';
import { Course } from '../utils/gpa-calculator';
import { Assignment } from '../utils/task-manager';
import { ClassPeriod } from '../utils/schedule-data';

interface DataCache {
  grades: GradeEntry[] | null;
  courses: Course[] | null;
  assignments: Assignment[] | null;
  schedule: ClassPeriod[] | null;
  loading: boolean;
  error: string | null;
}

interface DataContextType {
  cache: DataCache;
  loadGradesAndCourses: () => Promise<void>;
  clearCache: () => void;
}

const EMPTY_CACHE: DataCache = {
  grades: null, courses: null, assignments: null, schedule: null, loading: false, error: null,
};

export const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const creds = useCreds();
  const [cache, setCache] = useState<DataCache>(EMPTY_CACHE);

  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const loadGradesAndCourses = useCallback(async () => {
    if (!creds) return;
    const c = cacheRef.current;
    if (c.grades && c.courses && c.assignments && c.schedule) return;
    if (c.loading) return;

    try {
      setCache((prev) => ({ ...prev, loading: true, error: null }));
      const [grades, assignments, schedule] = await Promise.all([
        fetchGrades(creds.hacUrl, creds.username, creds.password),
        fetchAssignments(creds.hacUrl, creds.username, creds.password),
        fetchSchedule(creds.hacUrl, creds.username, creds.password),
      ]);
      const courses = await fetchCourses(creds.hacUrl, creds.username, creds.password, grades);
      setCache({ grades, courses, assignments, schedule, loading: false, error: null });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load data';
      setCache((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [creds]);

  const clearCache = useCallback(() => {
    cacheRef.current = EMPTY_CACHE;
    setCache(EMPTY_CACHE);
  }, []);

  useEffect(() => {
    if (creds) {
      loadGradesAndCourses();
    } else {
      clearCache();
    }
  }, [creds]);

  return (
    <DataContext.Provider value={{ cache, loadGradesAndCourses, clearCache }}>
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
