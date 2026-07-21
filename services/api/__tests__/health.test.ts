import { checkServiceStatus } from '../health';
import { API_BASE_URL } from '../config';

const HAC_URL = 'https://homeaccess.friscoisd.org/';

function mockReachability(reachable: (url: string) => boolean) {
  global.fetch = jest.fn(async (url: string) => {
    if (!reachable(url)) throw new TypeError('Network request failed');
    return { ok: true } as Response;
  }) as unknown as typeof fetch;
}

describe('checkServiceStatus', () => {
  it('reports ok when the proxy and the district both respond', async () => {
    mockReachability(() => true);
    await expect(checkServiceStatus(HAC_URL)).resolves.toBe('ok');
  });

  it('blames the district when only its host is unreachable', async () => {
    mockReachability((url) => url !== HAC_URL);
    await expect(checkServiceStatus(HAC_URL)).resolves.toBe('district-down');
  });

  it('blames the proxy when the internet is otherwise reachable', async () => {
    mockReachability((url) => url !== API_BASE_URL);
    await expect(checkServiceStatus(HAC_URL)).resolves.toBe('proxy-down');
  });

  it('reports offline when nothing is reachable', async () => {
    mockReachability(() => false);
    await expect(checkServiceStatus(HAC_URL)).resolves.toBe('offline');
  });

  it('skips the district probe when no url is known', async () => {
    mockReachability((url) => url === API_BASE_URL);
    await expect(checkServiceStatus()).resolves.toBe('ok');
  });
});
