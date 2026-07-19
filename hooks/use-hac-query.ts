import { useCallback, useEffect, useReducer, useRef } from 'react';

interface Entry {
  data: unknown;
  error: string | null;
  updatedAt: number;
  loading: boolean;
  promise: Promise<void> | null;
}

const store = new Map<string, Entry>();
const subscribers = new Map<string, Set<() => void>>();

const DEFAULT_TTL = 5 * 60 * 1000;

function getEntry(key: string): Entry {
  let entry = store.get(key);
  if (!entry) {
    entry = { data: null, error: null, updatedAt: 0, loading: false, promise: null };
    store.set(key, entry);
  }
  return entry;
}

function notify(key: string) {
  subscribers.get(key)?.forEach((fn) => fn());
}

function subscribe(key: string, fn: () => void): () => void {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

// dedupes concurrent callers, retries on failure, and captures the result in the store
function revalidate(key: string, fetcher: () => Promise<unknown>, retries: number): Promise<void> {
  const entry = getEntry(key);
  if (entry.promise) return entry.promise;
  entry.loading = true;
  notify(key);

  const attempt = async (n: number): Promise<unknown> => {
    try {
      return await fetcher();
    } catch (e) {
      if (n < retries) return attempt(n + 1);
      throw e;
    }
  };

  const promise = attempt(0)
    .then(
      (data) => {
        entry.data = data;
        entry.error = null;
        entry.updatedAt = Date.now();
      },
      (e: unknown) => {
        entry.error = e instanceof Error ? e.message : 'Failed to load';
      }
    )
    .finally(() => {
      entry.promise = null;
      entry.loading = false;
      notify(key);
    });

  entry.promise = promise;
  return promise;
}

export function invalidateQuery(key: string): Promise<void> {
  store.delete(key);
  notify(key);
  return Promise.resolve();
}

export function invalidateAllQueries() {
  const keys = Array.from(store.keys());
  store.clear();
  keys.forEach(notify);
}

export interface HacQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

interface Options {
  enabled?: boolean;
  ttl?: number;
  retries?: number;
}

export function useHacQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: Options = {}
): HacQuery<T> {
  const { enabled = true, ttl = DEFAULT_TTL, retries = 1 } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const active = enabled && key !== null;

  const load = useCallback(
    (force: boolean): Promise<void> => {
      if (!active || key === null) return Promise.resolve();
      const entry = getEntry(key);
      if (!force && !entry.promise && entry.data !== null && Date.now() - entry.updatedAt < ttl) {
        return Promise.resolve();
      }
      return revalidate(key, () => fetcherRef.current(), retries);
    },
    [active, key, ttl, retries]
  );

  useEffect(() => {
    if (!active || key === null) return;
    const unsub = subscribe(key, forceRender);
    load(false);
    return unsub;
  }, [active, key, load]);

  const refetch = useCallback(() => load(true), [load]);

  const entry = active && key !== null ? store.get(key) : undefined;
  const data = (entry?.data ?? null) as T | null;
  const error = entry?.error ?? null;

  return {
    data,
    error,
    loading: active && data === null && error === null && (entry ? entry.loading : true),
    refetch,
  };
}
