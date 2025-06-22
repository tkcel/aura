import { contextBridge, ipcRenderer } from "electron";

import {
  AppSettings,
  ProcessingResult,
  STTResult,
  AppState,
  HistoryEntry,
} from "./types";

// API for renderer process
const api = {
  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: Partial<AppSettings>): Promise<boolean> =>
    ipcRenderer.invoke("update-settings", settings),

  // Clipboard
  copyToClipboard: (text: string): Promise<boolean> =>
    ipcRenderer.invoke("copy-to-clipboard", text),

  // API Connection
  testApiConnection: (): Promise<{
    success: boolean;
    connected?: boolean;
    error?: string;
  }> => ipcRenderer.invoke("test-api-connection"),

  // LLM Processing
  processWithLLM: (data: {
    text: string;
    agentId: string;
  }): Promise<{ success: boolean; result?: unknown; error?: string }> =>
    ipcRenderer.invoke("process-with-llm", data),

  // File operations
  openExternal: (path: string): Promise<void> =>
    ipcRenderer.invoke("open-external", path),

  saveAudioFile: (data: {
    data: number[];
    mimeType: string;
  }): Promise<{ filePath: string }> =>
    ipcRenderer.invoke("save-audio-file", data),

  // History operations
  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke("get-history"),

  addHistoryEntry: (entry: Omit<HistoryEntry, "id">): Promise<string> =>
    ipcRenderer.invoke("add-history-entry", entry),

  deleteHistoryEntry: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("delete-history-entry", id),

  clearHistory: (): Promise<void> => ipcRenderer.invoke("clear-history"),

  // Window management
  showSettingsWindow: (): Promise<void> =>
    ipcRenderer.invoke("show-settings-window"),

  hideSettingsWindow: (): Promise<void> =>
    ipcRenderer.invoke("hide-settings-window"),

  hideBarWindow: (): Promise<void> => ipcRenderer.invoke("hide-bar-window"),

  showBarWindow: (): Promise<void> => ipcRenderer.invoke("show-bar-window"),

  showBarContextMenu: (): Promise<void> =>
    ipcRenderer.invoke("show-bar-context-menu"),

  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore);
  },

  // Cursor state and auto-paste
  checkCursorState: (): Promise<boolean> =>
    ipcRenderer.invoke("check-cursor-state"),

  pasteText: (text: string): Promise<boolean> =>
    ipcRenderer.invoke("paste-text", text),

  showResultWindow: (): Promise<void> =>
    ipcRenderer.invoke("show-result-window"),

  closeResultWindow: (): Promise<void> =>
    ipcRenderer.invoke("close-result-window"),

  // Event listeners
  onStateChanged: (callback: (state: AppState) => void) => {
    ipcRenderer.on("state-changed", (_, state) => callback(state));
  },

  onSttResult: (callback: (result: STTResult) => void) => {
    ipcRenderer.on("stt-result", (_, result) => callback(result));
  },

  onProcessingComplete: (callback: (result: ProcessingResult) => void) => {
    ipcRenderer.on("processing-complete", (_, result) => callback(result));
  },

  onError: (callback: (error: string) => void) => {
    ipcRenderer.on("error", (_, error) => callback(error));
  },

  onShowSettings: (callback: () => void) => {
    ipcRenderer.on("show-settings", () => callback());
  },

  onSelectAgent: (callback: (agentId: string) => void) => {
    ipcRenderer.on("select-agent", (_, agentId) => callback(agentId));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld("electronAPI", api);

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
