import { useState, useEffect, useRef } from 'react';

const PROBE_URL = 'https://gradient-hac-api.vercel.app';
const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 5_000;

export function useNetworkStatus(): boolean {
  const [isOffline, setIsOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

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
    return () => clearInterval(timerRef.current);
  }, []);

  return isOffline;
}
