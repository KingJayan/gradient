import { useCreds, Creds } from './use-creds';
import { useHacQuery, HacQuery } from './use-hac-query';

export function useScreenData<T>(
  key: string,
  fetcher: (creds: Creds) => Promise<T>
): HacQuery<T> {
  const creds = useCreds();
  return useHacQuery<T>(creds ? key : null, () => fetcher(creds!));
}
