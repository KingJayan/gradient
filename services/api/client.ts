import { logError, logWarning } from '../../utils/error-logger';
import { API_URL } from './config';

export function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

export function safeString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

export function safeNumber(val: unknown, fallback = NaN): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export class HACError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'HACError';
  }
}

function parseAPIError(status: number, endpoint: string): string {
  if (status === 401 || status === 403) {
    return 'Invalid credentials. Please log in again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status === 500 || status === 502 || status === 503) {
    return 'District server is temporarily unavailable. Try again later.';
  }
  if (status === 404) {
    return `Data not available for ${endpoint}.`;
  }
  return `Unable to load ${endpoint}. Check your connection.`;
}

export async function apiFetch<T>(
  endpoint: string,
  hacUrl: string,
  username: string,
  password: string,
  parse: (data: unknown, endpoint: string) => T,
  signal?: AbortSignal
): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: hacUrl, user: username, pass: password }),
      signal,
    });
    if (!res.ok) {
      throw new HACError(parseAPIError(res.status, endpoint), res.status);
    }
    return parse(await res.json(), endpoint);
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    if (e instanceof HACError) throw e;
    if (e instanceof TypeError && e.message.includes('fetch')) {
      const networkError = new HACError('No internet connection. Please check your network.');
      logWarning('Network error in apiFetch', { endpoint, error: (e as Error).message });
      throw networkError;
    }
    const wrappedError = new HACError(`Failed to load ${endpoint}`);
    logError(e as Error, { endpoint });
    throw wrappedError;
  }
}
