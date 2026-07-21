import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext, AuthContextType, Student } from '../../context/auth-context';
import { useCreds } from '../use-creds';

const user: Student = {
  id: '1',
  username: 'student',
  hacUrl: 'https://hac.example.org',
  name: 'Test Student',
};

function wrapper(value: AuthContextType) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
}

function authValue(current: Student | null): AuthContextType {
  return {
    state: { isLoggedOut: !current, userToken: current ? 'authenticated' : null, user: current },
    bootstrapAsync: jest.fn(async () => {}),
    login: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.setItemAsync('userPass', 'hunter2');
});

describe('useCreds', () => {
  it('returns null until the password is read from the keychain', async () => {
    const { result } = renderHook(() => useCreds(), { wrapper: wrapper(authValue(user)) });

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual({
      hacUrl: user.hacUrl,
      username: user.username,
      password: 'hunter2',
    });
  });

  it('keeps a stable object identity across re-renders so queries do not refetch', async () => {
    const { result, rerender } = renderHook(() => useCreds(), { wrapper: wrapper(authValue(user)) });

    await waitFor(() => expect(result.current).not.toBeNull());
    const first = result.current;

    rerender(undefined);
    rerender(undefined);

    expect(result.current).toBe(first);
  });

  it('reads the keychain once per user', async () => {
    const { result, rerender } = renderHook(() => useCreds(), { wrapper: wrapper(authValue(user)) });

    await waitFor(() => expect(result.current).not.toBeNull());
    rerender(undefined);

    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('logs out when the keychain read fails', async () => {
    const value = authValue(user);
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keychain locked'));

    renderHook(() => useCreds(), { wrapper: wrapper(value) });

    await waitFor(() => expect(value.logout).toHaveBeenCalled());
  });

  it('stays null and never touches the keychain when signed out', async () => {
    const { result } = renderHook(() => useCreds(), { wrapper: wrapper(authValue(null)) });

    await act(async () => {});

    expect(result.current).toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });
});
