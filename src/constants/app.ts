/**
 * Application constants
 */

export const APP_CONFIG = {
  NAME: "Aura",
  VERSION: "1.0.0",
  BUNDLE_ID: "com.aura.app",
  CONFIG_DIR: ".aura",
  FILES: {
    SETTINGS: "settings.json",
    HISTORY: "history.json",
    RECORDINGS_DIR: "recordings",
  },
} as const;

export const WINDOW_CONFIG = {
  BAR: {
    WIDTH: 60,
    HEIGHT: 60,
    OFFSET: 10,
  },
  SETTINGS: {
    WIDTH: 800,
    HEIGHT: 900,
    MIN_WIDTH: 600,
    MIN_HEIGHT: 700,
  },
} as const;

export const SHORTCUTS = {
  TOGGLE_BAR: "CommandOrControl+Shift+A",
  OPEN_SETTINGS: "CmdOrCtrl+,",
} as const;

export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000,
  CHANNEL_COUNT: 1,
  BITS_PER_SECOND: 128000,
  CHUNK_SIZE: 100,
  SUPPORTED_MIME_TYPES: [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ],
} as const;

export const API_CONFIG = {
  WHISPER_MODEL: "whisper-1",
  DEFAULT_TEMPERATURE: 0.7,
  MAX_RETRIES: 3,
  TIMEOUT: 30000,
} as const;

export const UI_CONFIG = {
  ANIMATION_DURATION: 200,
  SUCCESS_MESSAGE_DURATION: 3000,
  ERROR_MESSAGE_DURATION: 5000,
  PROCESSING_INDICATOR_DELAY: 100,
} as const;
