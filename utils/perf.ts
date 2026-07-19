import { logInfo } from './error-logger';

const marks = new Map<string, number>();

const perf = (globalThis as { performance?: { now?: () => number } }).performance;
const now = (): number => (typeof perf?.now === 'function' ? perf.now() : Date.now());

export function mark(name: string) {
  marks.set(name, now());
}

export function measure(label: string, startMark: string) {
  const start = marks.get(startMark);
  if (start === undefined) return;
  marks.delete(startMark);
  logInfo(`[PERF] ${label} ${Math.round(now() - start)}ms`);
}
