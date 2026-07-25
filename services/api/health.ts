import { API_BASE_URL } from './config';

export type ServiceStatus = 'ok' | 'district-down' | 'proxy-down' | 'offline';

const TIMEOUT_MS = 5_000;
const INTERNET_PROBE_URL = 'https://captive.apple.com/hotspot-detect.html';

async function reachable(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkServiceStatus(hacUrl?: string): Promise<ServiceStatus> {
  if (await reachable(API_BASE_URL)) {
    if (hacUrl && !(await reachable(hacUrl))) return 'district-down';
    return 'ok';
  }
  return (await reachable(INTERNET_PROBE_URL)) ? 'proxy-down' : 'offline';
}
