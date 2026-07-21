import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const SUPPORT_URL: string =
  (extra.supportUrl as string | undefined) ?? 'https://github.com/KingJayan/gradient/issues';

export const PRIVACY_URL: string =
  (extra.privacyUrl as string | undefined) ?? 'https://github.com/KingJayan/gradient#security';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const BUILD_NUMBER: string = Constants.expoConfig?.ios?.buildNumber ?? '0';
