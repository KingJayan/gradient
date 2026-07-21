import { districtName } from '../district';

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
