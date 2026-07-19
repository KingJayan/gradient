import { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AuthContext } from '../context/auth-context';
import * as SecureStore from 'expo-secure-store';
import { logError } from '../utils/error-logger';

export interface Creds {
  hacUrl: string;
  username: string;
  password: string;
}

export function useCreds(): Creds | null {
  const ctx = useContext(AuthContext);
  const u = ctx?.state.user;
  const [password, setPassword] = useState<string | null>(null);
  const logoutRef = useRef(ctx?.logout);
  logoutRef.current = ctx?.logout;

  useEffect(() => {
    if (!u) {
      setPassword(null);
      return;
    }
    SecureStore.getItemAsync('userPass')
      .then(setPassword)
      .catch((e) => {
        logError(e as Error, { action: 'useCreds.getUserPass' });
        logoutRef.current?.();
      });
  }, [u]);

  return useMemo(
    () => (!u || !password ? null : { hacUrl: u.hacUrl, username: u.username, password }),
    [u, password]
  );
}
