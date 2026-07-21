const GENERIC_HOST_PARTS = new Set(['www', 'homeaccess', 'hac', 'com', 'net', 'org', 'edu', 'us', 'app']);

export function districtName(hacUrl?: string): string {
  const host = hacUrl?.split('/')[2] ?? '';
  const label = host.split('.').find((part) => part && !GENERIC_HOST_PARTS.has(part));
  return label ? label.toUpperCase() : 'your district';
}
