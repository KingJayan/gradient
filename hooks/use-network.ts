import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api/config';

const PROBE_URL = API_BASE_URL;
const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 5_000;

export function useNetworkStatus(): boolean {
  const [isOffline, setIsOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const probe = async () => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      await fetch(PROBE_URL, { method: 'HEAD', signal: ctrl.signal });
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    } finally {
      clearTimeout(timeout);
    }
  };

  useEffect(() => {
    probe();
    timerRef.current = setInterval(probe, INTERVAL_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return isOffline;
}
