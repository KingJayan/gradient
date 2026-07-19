import { useReducer, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthState, Student } from '../context/auth-context';
import { logError } from '../utils/error-logger';

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
        SecureStore.getItemAsync('userToken'),
        SecureStore.getItemAsync('user'),
        SecureStore.getItemAsync('userPass'),
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
      const response = await fetch('https://gradient-hac-api.vercel.app/api/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: hacUrl, user: username, pass: password }),
      });
      if (!response.ok) throw new Error('Invalid credentials');
      const data = await response.json();
      const name = typeof data?.name === 'string' ? data.name : undefined;

      const token = CREDENTIAL_PRESENCE_MARKER;
      const user: Student = { id: username, username, hacUrl, name };

      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('userPass', password);

      dispatch({ type: 'SIGN_IN', payload: { token, user } });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('userPass');
      dispatch({ type: 'SIGN_OUT' });
    } catch (e) {
      logError(e as Error, { action: 'logout' });
    }
  }, []);

  return { state, bootstrapAsync, login, logout };
}
