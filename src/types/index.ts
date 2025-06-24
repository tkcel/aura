// Model types
export type LLMModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
export type Language = 'ja' | 'en' | 'auto';
export type UILanguage = 'ja' | 'en';
export type AgentColor = string; // Could be restricted to specific colors

export interface Agent {
  id: string;
  name: string;
  hotkey: string;
  instruction: string;
  model: LLMModel;
  temperature: number;
  enabled: boolean;
  autoProcessAi: boolean;
  color: AgentColor;
}

export interface AppSettings {
  openaiApiKey: string;
  language: Language; // For speech recognition
  uiLanguage: UILanguage; // For UI display
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
  model: LLMModel;
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

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
}

export interface AgentValidationResult {
  isValid: boolean;
  agent?: Agent;
  error?: string;
}

// Utility types
export type PartialAgent = Partial<Agent>;
export type CreateHistoryEntry = Omit<HistoryEntry, 'id'>;

// Type guards
export function isValidAppState(value: string): value is AppState {
  return Object.values(AppState).includes(value as AppState);
}

export function isLLMResult(obj: unknown): obj is LLMResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'text' in obj &&
    'model' in obj &&
    'tokensUsed' in obj &&
    typeof (obj as LLMResult).text === 'string' &&
    typeof (obj as LLMResult).model === 'string' &&
    typeof (obj as LLMResult).tokensUsed === 'number'
  );
}