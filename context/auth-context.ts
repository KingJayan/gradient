import React from 'react';

export interface Student {
  id: string;
  username: string;
  hacUrl: string;
  name?: string;
  // password NO LONGER stored in user object — kept only in SecureStore
  // fetch on-demand via useCreds() for API calls
}

export interface AuthState {
  isLoggedOut: boolean;
  userToken: string | null;
  user: Student | null;
}

export interface AuthContextType {
  state: AuthState;
  bootstrapAsync: () => Promise<void>;
  login: (username: string, password: string, hacUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);
