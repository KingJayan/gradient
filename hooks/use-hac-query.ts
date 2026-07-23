import { useCallback, useEffect, useReducer, useRef } from 'react';
import { loadPersistedCache, persistCache, clearPersistedCache } from './query-persist';

interface Entry {
  data: unknown;
  error: string | null;
  updatedAt: number;
  loading: boolean;
  promise: Promise<void> | null;
  controller: AbortController | null;
}

const store = new Map<string, Entry>();
const subscribers = new Map<string, Set<() => void>>();

const DEFAULT_TTL = 5 * 60 * 1000;

function getEntry(key: string): Entry {
  let entry = store.get(key);
  if (!entry) {
    entry = { data: null, error: null, updatedAt: 0, loading: false, promise: null, controller: null };
    store.set(key, entry);
  }
  return entry;
}

function notify(key: string) {
  subscribers.get(key)?.forEach((fn) => fn());
}

function persistStore() {
  const snapshot: Record<string, { data: unknown; updatedAt: number }> = {};
  store.forEach((entry, key) => {
    if (entry.data !== null) snapshot[key] = { data: entry.data, updatedAt: entry.updatedAt };
  });
  persistCache(snapshot);
}

loadPersistedCache().then((persisted) => {
  for (const [key, { data, updatedAt }] of Object.entries(persisted)) {
    const entry = getEntry(key);
    if (entry.data === null) {
      entry.data = data;
      entry.updatedAt = updatedAt;
    }
  }
  subscribers.forEach((set) => set.forEach((fn) => fn()));
});

function subscribe(key: string, fn: () => void): () => void {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

// dedupes concurrent callers and captures the result in the store
function revalidate(key: string, fetcher: (signal: AbortSignal) => Promise<unknown>): Promise<void> {
  const entry = getEntry(key);
  if (entry.promise) return entry.promise;
  const controller = new AbortController();
  entry.controller = controller;
  entry.loading = true;
  notify(key);

  const promise = fetcher(controller.signal)
    .then(
      (data) => {
        entry.data = data;
        entry.error = null;
        entry.updatedAt = Date.now();
        persistStore();
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        entry.error = e instanceof Error ? e.message : 'Failed to load';
      }
    )
    .finally(() => {
      entry.promise = null;
      entry.controller = null;
      entry.loading = false;
      if (!controller.signal.aborted) notify(key);
    });

  entry.promise = promise;
  return promise;
}

export function invalidateQuery(key: string): Promise<void> {
  store.get(key)?.controller?.abort();
  store.delete(key);
  notify(key);
  return Promise.resolve();
}

export function invalidateAllQueries() {
  const keys = Array.from(store.keys());
  store.forEach((entry) => entry.controller?.abort());
  store.clear();
  clearPersistedCache();
  keys.forEach(notify);
}

export interface HacQuery<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: number;
  refetch: () => Promise<void>;
}

interface Options {
  enabled?: boolean;
  ttl?: number;
}

export function useHacQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: Options = {}
): HacQuery<T> {
  const { enabled = true, ttl = DEFAULT_TTL } = options;
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
      return revalidate(key, (signal) => fetcherRef.current(signal));
    },
    [active, key, ttl]
  );

  useEffect(() => {
    if (!active || key === null) return;
    const unsub = subscribe(key, forceRender);
    load(false);
    return () => {
      unsub();
      if (!subscribers.get(key)?.size) store.get(key)?.controller?.abort();
    };
  }, [active, key, load]);

  const refetch = useCallback(() => load(true), [load]);

  const entry = active && key !== null ? store.get(key) : undefined;
  const data = (entry?.data ?? null) as T | null;
  const error = entry?.error ?? null;

  return {
    data,
    error,
    loading: active && data === null && error === null && (entry ? entry.loading : true),
    updatedAt: entry?.updatedAt ?? 0,
    refetch,
  };
}
