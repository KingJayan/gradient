import { districtName, isValidHacUrl, normalizeHacUrl, searchDistricts } from '../district';

describe('normalizeHacUrl', () => {
  it('adds a scheme and trailing slash', () => {
    expect(normalizeHacUrl('homeaccess.friscoisd.org')).toBe('https://homeaccess.friscoisd.org/');
    expect(normalizeHacUrl('  https://hac.pisd.edu ')).toBe('https://hac.pisd.edu/');
  });

  it('returns empty for blank input', () => {
    expect(normalizeHacUrl('   ')).toBe('');
  });
});

describe('isValidHacUrl', () => {
  it('accepts host-only and full https urls', () => {
    expect(isValidHacUrl('homeaccess.katyisd.org')).toBe(true);
    expect(isValidHacUrl('https://hac.nisd.net/HomeAccess')).toBe(true);
  });

  it('rejects blanks, http, and hosts without a dot', () => {
    expect(isValidHacUrl('')).toBe(false);
    expect(isValidHacUrl('http://homeaccess.katyisd.org')).toBe(false);
    expect(isValidHacUrl('localhost')).toBe(false);
  });
});

describe('searchDistricts', () => {
  it('returns the full directory for an empty query', () => {
    expect(searchDistricts('').length).toBeGreaterThan(0);
  });

  it('filters by name case-insensitively', () => {
    const hits = searchDistricts('frisco');
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('frisco');
  });
});

describe('districtName', () => {
  it('picks the district label out of a HAC host', () => {
    expect(districtName('https://homeaccess.friscoisd.org/')).toBe('FRISCOISD');
    expect(districtName('https://www.homeaccess.cfisd.net/HomeAccess')).toBe('CFISD');
  });

  it('falls back when the url is missing or unrecognizable', () => {
    expect(districtName()).toBe('your district');
    expect(districtName('https://homeaccess.org/')).toBe('your district');
  });
});
