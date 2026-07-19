import { logWarning } from '../../utils/error-logger';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function stripUnsafe(obj: Record<string, unknown>): Record<string, unknown> {
  let cleaned = obj;
  for (const key of Object.keys(obj)) {
    if (UNSAFE_KEYS.has(key)) {
      if (cleaned === obj) cleaned = { ...obj };
      delete cleaned[key];
    }
  }
  return cleaned;
}

export function recordResponse(data: unknown, endpoint: string): Record<string, unknown> {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    logWarning('Unexpected API response shape', { endpoint, expected: 'object' });
    return {};
  }
  return stripUnsafe(data as Record<string, unknown>);
}

export interface Table {
  headers: unknown[];
  rows: unknown[][];
}

export function tableResponse(data: unknown, endpoint: string): Table {
  const rec = recordResponse(data, endpoint);
  if (!Array.isArray(rec.data)) {
    logWarning('Unexpected API response shape', { endpoint, expected: 'table' });
    return { headers: [], rows: [] };
  }
  return {
    headers: Array.isArray(rec.headers) ? rec.headers : [],
    rows: rec.data.filter((r): r is unknown[] => Array.isArray(r)),
  };
}
