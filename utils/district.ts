const GENERIC_HOST_PARTS = new Set(['www', 'homeaccess', 'hac', 'com', 'net', 'org', 'edu', 'us', 'app']);

export type District = { id: string; name: string; url: string };

export const DISTRICTS: District[] = [
  { id: 'frisco', name: 'Frisco ISD', url: 'https://homeaccess.friscoisd.org/' },
  { id: 'cfisd', name: 'Cypress-Fairbanks ISD', url: 'https://homeaccess.cfisd.net/' },
  { id: 'rrisd', name: 'Round Rock ISD', url: 'https://homeaccess.roundrockisd.org/' },
  { id: 'austin', name: 'Austin ISD', url: 'https://homeaccess.austinisd.org/' },
  { id: 'plano', name: 'Plano ISD', url: 'https://hac.pisd.edu/' },
  { id: 'katy', name: 'Katy ISD', url: 'https://homeaccess.katyisd.org/' },
  { id: 'fortbend', name: 'Fort Bend ISD', url: 'https://homeaccess.fortbendisd.com/' },
  { id: 'nisd', name: 'Northside ISD', url: 'https://hac.nisd.net/' },
  { id: 'klein', name: 'Klein ISD', url: 'https://homeaccess.kleinisd.net/' },
  { id: 'humble', name: 'Humble ISD', url: 'https://hac.humbleisd.net/' },
  { id: 'conroe', name: 'Conroe ISD', url: 'https://hac.conroeisd.net/' },
  { id: 'mansfield', name: 'Mansfield ISD', url: 'https://hac.misdmail.org/' },
  { id: 'keller', name: 'Keller ISD', url: 'https://homeaccess.kellerisd.net/' },
  { id: 'prosper', name: 'Prosper ISD', url: 'https://homeaccess.prosper-isd.net/' },
  { id: 'mckinney', name: 'McKinney ISD', url: 'https://hac.mckinneyisd.net/' },
  { id: 'allen', name: 'Allen ISD', url: 'https://hac.allenisd.org/' },
  { id: 'richardson', name: 'Richardson ISD', url: 'https://hac.risd.org/' },
  { id: 'lewisville', name: 'Lewisville ISD', url: 'https://hac.lisd.net/' },
  { id: 'garland', name: 'Garland ISD', url: 'https://hac.garlandisd.net/' },
  { id: 'springbranch', name: 'Spring Branch ISD', url: 'https://hac.springbranchisd.com/' },
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
