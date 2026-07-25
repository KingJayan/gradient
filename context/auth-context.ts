import React from 'react';

export interface Student {
  id: string;
  username: string;
  hacUrl: string;
  name?: string;
  profileId?: string;
}

export interface AuthState {
  isLoggedOut: boolean;
  userToken: string | null;
  user: Student | null;
}

export interface AuthContextType {
  state: AuthState;
  bootstrapAsync: () => Promise<void>;
  login: (username: string, password: string, hacUrl: string, profileId?: string, preknownName?: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);
