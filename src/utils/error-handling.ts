import { getErrorMessage } from './errors';

/**
 * Higher-order function that wraps async functions with standardized error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  onError?: (error: string) => void
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = getErrorMessage(error);
      onError?.(message);
      throw error;
    }
  }) as T;
}

/**
 * Standardized error handling for catch blocks
 */
export function handleError(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  if (context) {
    console.error(`${context}:`, message);
  } else {
    console.error('Error:', message);
  }
  return message;
}

/**
 * Silent error handler that only logs to console
 */
export function handleErrorSilently(error: unknown, context?: string): void {
  handleError(error, context);
}

/**
 * Creates a standardized catch handler
 */
export function createErrorHandler(context: string, onError?: (message: string) => void) {
  return (error: unknown) => {
    const message = handleError(error, context);
    onError?.(message);
  };
}