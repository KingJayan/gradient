import Constants from 'expo-constants';

const DEFAULT_BASE_URL = 'https://gradient-hac-api.vercel.app';

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? DEFAULT_BASE_URL;

export const API_URL = `${API_BASE_URL}/api`;
