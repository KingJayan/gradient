import { useReducer, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthState, Student } from '../context/auth-context';
import { logError } from '../utils/error-logger';
import { API_URL } from '../services/api/config';
import { DEMO_CREDENTIALS, DEMO_STUDENT_NAME, isDemoUser } from '../services/api/demo';
import { districtName } from '../utils/district';
import { SECURE_KEYS, wipeLocalData } from '../utils/storage';

const CREDENTIAL_PRESENCE_MARKER = 'authenticated';

type AuthAction =
  | { type: 'RESTORE_TOKEN'; payload: { token: string; user: Student } }
  | { type: 'SIGN_IN'; payload: { token: string; user: Student } }
  | { type: 'SIGN_OUT' };

const initialState: AuthState = {
  isLoggedOut: false,
  userToken: null,
  user: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_TOKEN':
    case 'SIGN_IN':
      return {
        isLoggedOut: false,
        userToken: action.payload.token,
        user: action.payload.user,
      };
    case 'SIGN_OUT':
      return {
        isLoggedOut: true,
        userToken: null,
        user: null,
      };
    default:
      return state;
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const bootstrapAsync = useCallback(async () => {
    try {
      const [token, userJson, password] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.token),
        SecureStore.getItemAsync(SECURE_KEYS.user),
        SecureStore.getItemAsync(SECURE_KEYS.password),
      ]);

      if (token && userJson && password) {
        const user = JSON.parse(userJson);
        dispatch({ type: 'RESTORE_TOKEN', payload: { token, user } });
      } else {
        dispatch({ type: 'SIGN_OUT' });
      }
    } catch (e) {
      logError(e as Error, { action: 'bootstrapAsync' });
      dispatch({ type: 'SIGN_OUT' });
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string, hacUrl: string) => {
      let name: string | undefined;
      if (isDemoUser(username)) {
        if (password !== DEMO_CREDENTIALS.password) {
          throw new Error(`The demo account password is "${DEMO_CREDENTIALS.password}".`);
        }
        name = DEMO_STUDENT_NAME;
      } else {
        const response = await fetch(`${API_URL}/name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: hacUrl, user: username, pass: password }),
        }).catch(() => {
          throw new Error('Could not reach Gradient. Check your connection and try again.');
        });
        if (response.status === 401 || response.status === 403) {
          throw new Error('That username or password did not work. Double-check them in Home Access Center.');
        }
        if (!response.ok) {
          throw new Error(`Home Access Center is not responding for ${districtName(hacUrl)}. Try again shortly.`);
        }
        const data = await response.json();
        name = typeof data?.name === 'string' ? data.name : undefined;
      }

      const token = CREDENTIAL_PRESENCE_MARKER;
      const user: Student = { id: username, username, hacUrl, name };

      await SecureStore.setItemAsync(SECURE_KEYS.token, token);
      await SecureStore.setItemAsync(SECURE_KEYS.user, JSON.stringify(user));
      await SecureStore.setItemAsync(SECURE_KEYS.password, password);

      dispatch({ type: 'SIGN_IN', payload: { token, user } });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(SECURE_KEYS.token),
        SecureStore.deleteItemAsync(SECURE_KEYS.user),
        SecureStore.deleteItemAsync(SECURE_KEYS.password),
      ]);
      dispatch({ type: 'SIGN_OUT' });
    } catch (e) {
      logError(e as Error, { action: 'logout' });
    }
  }, []);

  // Gradient stores nothing server-side, so deletion is a full local wipe;
  // the HAC account itself is owned by the district.
  const deleteAccount = useCallback(async () => {
    try {
      await wipeLocalData();
    } catch (e) {
      logError(e as Error, { action: 'deleteAccount' });
    } finally {
      dispatch({ type: 'SIGN_OUT' });
    }
  }, []);

  return { state, bootstrapAsync, login, logout, deleteAccount };
}
