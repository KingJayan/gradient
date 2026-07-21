import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useHacQuery, invalidateQuery, invalidateAllQueries } from '../use-hac-query';

beforeEach(async () => {
  invalidateAllQueries();
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('useHacQuery', () => {
  it('exposes loading, then data', async () => {
    const fetcher = jest.fn(async () => 'grades');
    const { result } = renderHook(() => useHacQuery('k', fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('grades'));
    expect(result.current.error).toBeNull();
  });

  it('exposes the failure message and recovers on refetch', async () => {
    const fetcher = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('grades');
    const { result } = renderHook(() => useHacQuery('k', fetcher));

    await waitFor(() => expect(result.current.error).toBe('offline'));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toBe('grades');
  });

  it('serves the cached value within the TTL and refetches past it', async () => {
    const fetcher = jest.fn(async () => 'grades');
    const first = renderHook(() => useHacQuery('k', fetcher));
    await waitFor(() => expect(first.result.current.data).toBe('grades'));

    renderHook(() => useHacQuery('k', fetcher));
    expect(fetcher).toHaveBeenCalledTimes(1);

    renderHook(() => useHacQuery('k', fetcher, { ttl: 0 }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('stays disabled while the key is null', async () => {
    const fetcher = jest.fn(async () => 'grades');
    const { result } = renderHook(() => useHacQuery(null, fetcher));

    await act(async () => {});

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('drops one key on invalidateQuery and leaves the others', async () => {
    const fetcher = jest.fn(async () => 'grades');
    const a = renderHook(() => useHacQuery('a', fetcher));
    const b = renderHook(() => useHacQuery('b', fetcher));
    await waitFor(() => expect(b.result.current.data).toBe('grades'));

    act(() => {
      invalidateQuery('a');
    });

    expect(a.result.current.data).toBeNull();
    expect(b.result.current.data).toBe('grades');
  });
});

describe('invalidateAllQueries', () => {
  it('clears the in-memory store and the persisted mirror on logout', async () => {
    const fetcher = jest.fn(async () => 'grades');
    const { result } = renderHook(() => useHacQuery('dashboard', fetcher));
    await waitFor(() => expect(result.current.data).toBe('grades'));
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());

    act(() => {
      invalidateAllQueries();
    });

    expect(result.current.data).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hacQueryCache');
    await waitFor(async () => expect(await AsyncStorage.getItem('hacQueryCache')).toBeNull());
  });

  it('aborts the request in flight so a logged-out fetch cannot repopulate the cache', async () => {
    let seen: AbortSignal | undefined;
    const fetcher = jest.fn((signal: AbortSignal) => {
      seen = signal;
      return new Promise<string>(() => {});
    });
    renderHook(() => useHacQuery('dashboard', fetcher));

    act(() => {
      invalidateAllQueries();
    });

    expect(seen?.aborted).toBe(true);
  });
});
