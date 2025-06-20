export interface Agent {
  id: string;
  name: string;
  hotkey: string;
  instruction: string;
  model: string;
  temperature: number;
  enabled: boolean;
}

export interface AppSettings {
  openaiApiKey: string;
  language: 'ja' | 'en' | 'auto';
  agents: Agent[];
  autoStartup: boolean;
  systemTray: boolean;
  soundNotifications: boolean;
  saveAudioFiles: boolean;
  maxHistoryEntries: number;
}

export interface STTResult {
  text: string;
  language: string;
  confidence: number;
}

export interface LLMResult {
  text: string;
  model: string;
  tokensUsed: number;
}

export interface ProcessingResult {
  agentId: string;
  sttResult: STTResult;
  llmResult: LLMResult;
  timestamp: Date;
  audioFilePath?: string;
}

export interface HistoryEntry {
  id: string;
  agentId: string;
  agentName: string;
  transcription: string;
  response: string;
  timestamp: Date;
  audioFilePath?: string;
  duration?: number;
}


export enum AppState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING_STT = 'processing_stt',
  PROCESSING_LLM = 'processing_llm',
  COMPLETED = 'completed',
  ERROR = 'error'
}