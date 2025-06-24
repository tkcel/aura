/**
 * Custom error classes for better error handling
 */

export class AriaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AriaError';
  }
}

export class RecordingError extends AriaError {
  constructor(message: string, details?: unknown) {
    super(message, 'RECORDING_ERROR', details);
    this.name = 'RecordingError';
  }
}

export class TranscriptionError extends AriaError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSCRIPTION_ERROR', details);
    this.name = 'TranscriptionError';
  }
}

export class LLMError extends AriaError {
  constructor(message: string, details?: unknown) {
    super(message, 'LLM_ERROR', details);
    this.name = 'LLMError';
  }
}

export class SettingsError extends AriaError {
  constructor(message: string, details?: unknown) {
    super(message, 'SETTINGS_ERROR', details);
    this.name = 'SettingsError';
  }
}

export class WindowError extends AriaError {
  constructor(message: string, details?: unknown) {
    super(message, 'WINDOW_ERROR', details);
    this.name = 'WindowError';
  }
}

/**
 * Type guard to check if an error is an AriaError
 */
export function isAriaError(error: unknown): error is AriaError {
  return error instanceof AriaError;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isAriaError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const prefix = context ? `[${context}] ` : '';
  console.error(`${prefix}${message}`, error);
}