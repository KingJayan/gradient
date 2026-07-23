import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';
import { logWarning } from './error-logger';

const extra = Constants.expoConfig?.extra ?? {};

export const SUPPORT_URL: string =
  (extra.supportUrl as string | undefined) ?? 'https://github.com/KingJayan/gradient/issues';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const BUILD_NUMBER: string = Constants.expoConfig?.ios?.buildNumber ?? '0';

export async function openLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (e) {
    logWarning('Failed to open link', { url, error: e instanceof Error ? e.message : String(e) });
    Alert.alert('Unable to Open Link', url);
  }
}
