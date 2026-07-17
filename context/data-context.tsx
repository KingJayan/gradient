import React, { createContext, useState, useCallback, useContext, useRef } from 'react';
import { useCreds } from '../hooks/use-creds';
import { fetchGrades, fetchCourses, fetchAssignments, GradeEntry } from '../services/hac-api';
import { Course } from '../utils/gpa-calculator';
import { Assignment } from '../utils/task-manager';

interface DataCache {
  grades: GradeEntry[] | null;
  courses: Course[] | null;
  assignments: Assignment[] | null;
  loading: boolean;
  error: string | null;
}

interface DataContextType {
  cache: DataCache;
  loadGradesAndCourses: () => Promise<void>;
  clearCache: () => void;
}

export const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const creds = useCreds();
  const [cache, setCache] = useState<DataCache>({
    grades: null,
    courses: null,
    assignments: null,
    loading: false,
    error: null,
  });

  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const loadGradesAndCourses = useCallback(async () => {
    if (!creds) return;
    const c = cacheRef.current;
    if (c.grades && c.courses && c.assignments) return;
    if (c.loading) return;

    try {
      setCache((prev) => ({ ...prev, loading: true, error: null }));
      const [grades, assignments] = await Promise.all([
        fetchGrades(creds.hacUrl, creds.username, creds.password),
        fetchAssignments(creds.hacUrl, creds.username, creds.password),
      ]);
      const courses = await fetchCourses(creds.hacUrl, creds.username, creds.password, grades);
      setCache({ grades, courses, assignments, loading: false, error: null });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load data';
      setCache((prev) => ({ ...prev, loading: false, error: errorMessage }));
    }
  }, [creds]);

  const clearCache = useCallback(() => {
    setCache({ grades: null, courses: null, assignments: null, loading: false, error: null });
  }, []);

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
