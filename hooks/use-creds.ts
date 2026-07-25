import { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AuthContext } from '../context/auth-context';
import * as SecureStore from 'expo-secure-store';
import { logError } from '../utils/error-logger';
import { SECURE_KEYS } from '../utils/storage';

export interface Creds {
  hacUrl: string;
  username: string;
  password: string;
  profileId?: string;
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
    SecureStore.getItemAsync(SECURE_KEYS.password)
      .then(setPassword)
      .catch((e) => {
        logError(e as Error, { action: 'useCreds.getUserPass' });
        logoutRef.current?.();
      });
  }, [u]);

  return useMemo(
    () => (!u || !password ? null : { hacUrl: u.hacUrl, username: u.username, password, profileId: u.profileId }),
    [u, password]
  );
}
