const GENERIC_HOST_PARTS = new Set(['www', 'homeaccess', 'hac', 'com', 'net', 'org', 'edu', 'us', 'app']);

export type District = { id: string; name: string; url: string };

export const DISTRICTS: District[] = [
  { id: 'frisco', name: 'Frisco ISD', url: 'https://hac.friscoisd.org/' },
  { id: 'rrisd', name: 'Round Rock ISD', url: 'https://accesscenter.roundrockisd.org/' },
  { id: 'coppell', name: 'Coppell ISD', url: 'https://hac.coppellisd.com/HomeAccess/' },
  { id: 'aldine', name: 'Aldine ISD', url: 'https://hac.aldineisd.org/HomeAccess/' }
];

export function searchDistricts(query: string): District[] {
  const q = query.trim().toLowerCase();
  if (!q) return DISTRICTS;
  return DISTRICTS.filter((d) => d.name.toLowerCase().includes(q));
}

export function normalizeHacUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.endsWith('/') ? withScheme : `${withScheme}/`;
}

export function isValidHacUrl(input: string): boolean {
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(normalizeHacUrl(input));
}

export function districtName(hacUrl?: string): string {
  const host = hacUrl?.split('/')[2] ?? '';
  const label = host.split('.').find((part) => part && !GENERIC_HOST_PARTS.has(part));
  return label ? label.toUpperCase() : 'your district';
}
