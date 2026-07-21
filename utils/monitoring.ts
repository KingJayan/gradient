import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = Boolean(DSN) && !__DEV__;

export function initMonitoring() {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn: DSN,
    enableAutoSessionTracking: true,
    sendDefaultPii: false,
    attachStacktrace: true,
  });
  Sentry.setTag('otaUpdateId', Updates.updateId ?? 'embedded');
  Sentry.setTag('otaChannel', Updates.channel ?? 'none');
}

export function captureError(error: Error | string, context?: Record<string, unknown>) {
  if (!monitoringEnabled) return;
  const extra = { extra: context };
  if (typeof error === 'string') Sentry.captureMessage(error, { level: 'error', ...extra });
  else Sentry.captureException(error, extra);
}

export function captureWarning(message: string, context?: Record<string, unknown>) {
  if (!monitoringEnabled) return;
  Sentry.captureMessage(message, { level: 'warning', extra: context });
}

export const wrapRoot = Sentry.wrap;
