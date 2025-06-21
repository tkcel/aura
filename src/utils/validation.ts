/**
 * Validation utilities
 */

import { Agent, AppSettings } from '../types';

/**
 * Validate OpenAI API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.trim().startsWith('sk-') && apiKey.length > 10;
}

/**
 * Validate agent configuration
 */
export function isValidAgent(agent: unknown): agent is Agent {
  if (typeof agent !== 'object' || agent === null) {
    return false;
  }

  const a = agent as Record<string, unknown>;
  
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.hotkey === 'string' &&
    typeof a.instruction === 'string' &&
    typeof a.model === 'string' &&
    typeof a.temperature === 'number' &&
    typeof a.enabled === 'boolean' &&
    a.temperature >= 0 &&
    a.temperature <= 2
  );
}

/**
 * Validate app settings
 */
export function isValidSettings(settings: unknown): settings is AppSettings {
  if (typeof settings !== 'object' || settings === null) {
    return false;
  }

  const s = settings as Record<string, unknown>;

  return (
    typeof s.openaiApiKey === 'string' &&
    (s.language === 'ja' || s.language === 'en' || s.language === 'auto') &&
    Array.isArray(s.agents) &&
    s.agents.every(isValidAgent) &&
    typeof s.autoStartup === 'boolean' &&
    typeof s.systemTray === 'boolean' &&
    typeof s.soundNotifications === 'boolean' &&
    typeof s.saveAudioFiles === 'boolean' &&
    typeof s.maxHistoryEntries === 'number' &&
    s.maxHistoryEntries > 0
  );
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (typeof input === 'string') {
    return input.trim();
  }
  return '';
}

/**
 * Validate file path
 */
export function isValidFilePath(path: string): boolean {
  return typeof path === 'string' && path.length > 0 && !path.includes('..');
}

/**
 * Validate audio file MIME type
 */
export function isValidAudioMimeType(mimeType: string): boolean {
  const validTypes = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ];
  return validTypes.includes(mimeType);
}