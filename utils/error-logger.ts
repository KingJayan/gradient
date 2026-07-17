interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

export function logError(error: Error | string, context?: ErrorContext) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;
  console.error('[ERROR]', errorMessage, context);
  if (errorStack) console.error(errorStack);
}

export function logWarning(message: string, context?: ErrorContext) {
  console.warn('[WARN]', message, context);
}

export function logInfo(message: string, context?: ErrorContext) {
  console.log('[INFO]', message, context);
}
