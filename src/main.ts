import { execSync, spawn } from "child_process";
import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  systemPreferences,
  Tray,
} from "electron";
import * as os from "os";
import * as path from "path";

import * as fs from "fs-extra";

// Simple translation system for main process
const mainTranslations = {
  en: {
    "menu.openSettings": "OPEN SETTINGS",
    "menu.showToolbar": "SHOW TOOLBAR",
    "menu.hideToolbar": "HIDE TOOLBAR",
    "menu.exit": "EXIT",
  },
  ja: {
    "menu.openSettings": "設定を開く",
    "menu.showToolbar": "ツールバーを表示する",
    "menu.hideToolbar": "ツールバーを非表示にする",
    "menu.exit": "アプリを終了する",
  },
};

let currentMainLanguage: "en" | "ja" = "en";

function mainT(key: keyof typeof mainTranslations.en): string {
  return (
    mainTranslations[currentMainLanguage]?.[key] ||
    mainTranslations.en[key] ||
    key
  );
}

import { APP_CONFIG, SHORTCUTS, WINDOW_CONFIG } from "./constants/app";
import { LLMService } from "./services/llm";
import { SettingsService } from "./services/settings";
import { AppState, HistoryEntry, ProcessingResult, STTResult } from "./types";
import { handleErrorSilently } from "./utils/error-handling";
import { getErrorMessage } from "./utils/errors";
import { generateId } from "./utils/helpers";

/**
 * Class for detecting cursor state and managing auto-paste functionality
 */
class CursorStateManager {
  private isTyping = false;
  private lastInputTime = 0;

  /**
   * Check if the system is currently in a text input state
   */
  async checkCursorState(): Promise<boolean> {
    try {
      if (process.platform === "darwin") {
        return await this.checkMacOSCursorState();
      } else {
        // For Windows/Linux, implement basic fallback
        return false;
      }
    } catch (error) {
      console.error("Failed to check cursor state:", error);
      return false;
    }
  }

  /**
   * Check cursor state on macOS using Accessibility API
   */
  private async checkMacOSCursorState(): Promise<boolean> {
    try {
      // Get active application and focused element
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          try
            set focusedElement to name of (focused UI element of window 1 of application process frontApp)
            set elementRole to role of (focused UI element of window 1 of application process frontApp)
            return frontApp & "|" & focusedElement & "|" & elementRole
          on error
            return frontApp & "|none|none"
          end try
        end tell
      `;

      const result = execSync(`osascript -e '${script}'`, {
        encoding: "utf8",
        timeout: 2000,
      }).trim();

      const [appName, elementName, elementRole] = result.split("|");

      // Check if the focused element is a text input
      const textInputRoles = ["AXTextField", "AXTextArea", "AXComboBox"];
      const isTextInput = textInputRoles.includes(elementRole);

      // Check if the application is known to be text-oriented
      const isTextApp = this.isTextEditingApp(appName);

      return isTextInput || (isTextApp && elementRole !== "none");
    } catch (error) {
      console.error("macOS cursor state check failed:", error);
      return false;
    }
  }

  /**
   * Check if the application is commonly used for text editing
   */
  private isTextEditingApp(appName: string): boolean {
    if (!appName) return false;

    const textApps = [
      "Safari",
      "Google Chrome",
      "Firefox",
      "Microsoft Word",
      "Microsoft Excel",
      "Microsoft PowerPoint",
      "TextEdit",
      "Notes",
      "Visual Studio Code",
      "Xcode",
      "Terminal",
      "iTerm",
      "Slack",
      "Discord",
      "Teams",
      "Notion",
      "Obsidian",
      "Finder", // For renaming files
    ];

    return textApps.some((app) =>
      appName.toLowerCase().includes(app.toLowerCase())
    );
  }

  /**
   * Paste text to the active application
   */
  async pasteText(text: string): Promise<boolean> {
    try {
      // Set text to clipboard
      clipboard.writeText(text);

      if (process.platform === "darwin") {
        // macOS: Send Cmd+V
        const script = `
          tell application "System Events"
            keystroke "v" using command down
          end tell
        `;
        execSync(`osascript -e '${script}'`, { timeout: 2000 });
        return true;
      } else {
        // Windows/Linux: Send Ctrl+V
        // For a more complete implementation, consider using robotjs
        return false;
      }
    } catch (error) {
      console.error("Failed to paste text:", error);
      return false;
    }
  }

  /**
   * Get information about the currently active window
   */
  async getActiveWindowInfo(): Promise<{ appName: string; windowTitle: string } | null> {
    try {
      if (process.platform === "darwin") {
        const script = `
          tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            try
              set windowTitle to name of window 1 of application process frontApp
              return frontApp & "|" & windowTitle
            on error
              return frontApp & "|"
            end try
          end tell
        `;

        const result = execSync(`osascript -e '${script}'`, {
          encoding: "utf8",
          timeout: 2000,
        }).trim();

        const [appName, windowTitle] = result.split("|");
        return { appName: appName || "", windowTitle: windowTitle || "" };
      }
      return null;
    } catch (error) {
      console.error("Failed to get active window info:", error);
      return null;
    }
  }
}

/**
 * Main application class that manages Electron windows, services, and IPC communication
 */
class AriaApp {
  /** Bar window instance for floating button */
  private barWindow: BrowserWindow | null = null;

  /** Settings window instance for configuration */
  private settingsWindow: BrowserWindow | null = null;

  /** Result window instance for displaying processing results */
  private resultWindow: BrowserWindow | null = null;

  /** System tray instance */
  private tray: Tray | null = null;

  /** Settings service for managing app configuration */
  private settingsService: SettingsService;

  /** LLM service for AI processing */
  private llmService: LLMService;

  /** Cursor state manager for auto-paste functionality */
  private cursorStateManager: CursorStateManager;

  /** Current application state */
  private currentState: AppState = AppState.IDLE;

  /** Current recording state */
  private isRecording = false;

  /** Currently selected agent ID */
  private selectedAgent: string | null = null;

  /** Path to history file */
  private historyPath: string;

  /** Path to audio recordings directory */
  private audioDirectory: string;

  /** In-memory history entries */
  private history: HistoryEntry[] = [];

  /** Timer for window visibility checks */
  private visibilityCheckInterval: NodeJS.Timeout | null = null;

  /** Current STT result to share with result window */
  private currentSttResult: STTResult | null = null;

  /** Current LLM result to share with result window */
  private currentLlmResult: ProcessingResult | null = null;

  constructor() {
    this.settingsService = new SettingsService();
    this.llmService = new LLMService();
    this.cursorStateManager = new CursorStateManager();

    const configDir = path.join(os.homedir(), APP_CONFIG.CONFIG_DIR);
    this.historyPath = path.join(configDir, APP_CONFIG.FILES.HISTORY);
    this.audioDirectory = path.join(configDir, APP_CONFIG.FILES.RECORDINGS_DIR);

    fs.ensureDirSync(configDir);
    fs.ensureDirSync(this.audioDirectory);
    // History will be loaded asynchronously in initialize()
    const apiKey = this.settingsService.getApiKey();
    if (apiKey) {
      this.llmService.initializeOpenAI(apiKey);
    }

    this.setupIpcHandlers();

    // Initialize selected agent
    const enabledAgents = this.settingsService.getEnabledAgents();
    if (enabledAgents.length > 0) {
      this.selectedAgent = enabledAgents[0].id;
    }
  }

  /**
   * Sets up IPC handlers for communication between main and renderer processes
   */
  private setupIpcHandlers(): void {
    ipcMain.handle("get-settings", () => {
      return this.settingsService.getSettings();
    });

    ipcMain.handle("update-settings", async (_, settings) => {
      const oldSettings = this.settingsService.getSettings();
      this.settingsService.updateSettings(settings);
      
      if (settings.openaiApiKey) {
        this.llmService.initializeOpenAI(settings.openaiApiKey);
      }
      
      // Check if maxHistoryEntries was reduced
      if (settings.maxHistoryEntries !== undefined && 
          settings.maxHistoryEntries < (oldSettings.maxHistoryEntries || 100) &&
          this.history.length > settings.maxHistoryEntries) {
        // Trim history to new max entries
        const entriesToRemove = this.history.splice(settings.maxHistoryEntries);
        
        // Delete associated audio files for removed entries
        for (const removedEntry of entriesToRemove) {
          if (removedEntry.audioFilePath && fs.existsSync(removedEntry.audioFilePath)) {
            try {
              await fs.unlink(removedEntry.audioFilePath);
            } catch (error) {
              console.error("Failed to delete audio file:", error);
            }
          }
        }
        
        // Save the trimmed history
        this.saveHistory();
        
        // Update renderer
        this.sendToRenderer("history-updated", this.history);
      }
      
      return true;
    });

    ipcMain.handle("copy-to-clipboard", (_, text) => {
      clipboard.writeText(text);
      return true;
    });

    ipcMain.handle("open-external", async (_, filePath) => {
      await shell.openPath(filePath);
    });

    // API operations
    ipcMain.handle("test-api-connection", async () => {
      try {
        const isConnected = await this.llmService.testConnection();
        return { success: true, connected: isConnected };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        return { success: false, error: errorMessage };
      }
    });

    // Process with LLM only
    ipcMain.handle("process-with-llm", async (_, { text, agentId }) => {
      try {
        // Update selectedAgent if provided
        if (agentId && agentId !== this.selectedAgent) {
          this.setSelectedAgent(agentId);
        }

        const agent = this.settingsService.getAgent(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        // Check if agent is enabled
        if (!agent.enabled) {
          throw new Error(`Agent is disabled: ${agent.name}`);
        }

        this.setAppState(AppState.PROCESSING_LLM);

        const llmResult = await this.llmService.processText(text, agent);

        this.setAppState(AppState.COMPLETED);

        // Auto return to IDLE after showing results
        setTimeout(() => {
          this.setAppState(AppState.IDLE);
        }, 3000);

        // Handle the result (auto-paste or show result window)
        await this.handleProcessingComplete(llmResult, text);

        return { success: true, result: llmResult };
      } catch (error) {
        this.setAppState(AppState.ERROR);

        // Auto return to IDLE after showing error
        setTimeout(() => {
          this.setAppState(AppState.IDLE);
        }, 5000);

        const errorMessage = getErrorMessage(error);
        return { success: false, error: errorMessage };
      }
    });

    // Audio file saving
    ipcMain.handle("save-audio-file", async (_, { data, mimeType }) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const extension = mimeType.includes("webm") ? "webm" : "wav";
      const filename = `recording-${timestamp}.${extension}`;
      const filePath = path.join(this.audioDirectory, filename);

      // Convert number array back to buffer
      const buffer = Buffer.from(data);

      await fs.writeFile(filePath, buffer);

      return { filePath };
    });

    // History management
    ipcMain.handle("get-history", () => {
      return this.history;
    });
    
    ipcMain.handle("get-history-count", () => {
      // Get the latest count from the history file
      try {
        if (fs.existsSync(this.historyPath)) {
          const rawHistory = fs.readJsonSync(this.historyPath);
          return rawHistory.length;
        }
        return 0;
      } catch (error) {
        return 0;
      }
    });

    ipcMain.handle(
      "add-history-entry",
      async (_, entry: Omit<HistoryEntry, "id">) => {
        const id = generateId();
        const historyEntry: HistoryEntry = { id, ...entry };

        this.history.unshift(historyEntry); // Add to beginning
        
        // Check if history exceeds max entries and remove old entries
        const maxEntries = this.settings?.maxHistoryEntries || 100;
        if (this.history.length > maxEntries) {
          const entriesToRemove = this.history.splice(maxEntries);
          
          // Delete associated audio files for removed entries
          for (const removedEntry of entriesToRemove) {
            if (removedEntry.audioFilePath && fs.existsSync(removedEntry.audioFilePath)) {
              try {
                await fs.unlink(removedEntry.audioFilePath);
              } catch (error) {
                console.error("Failed to delete audio file:", error);
              }
            }
          }
        }
        
        this.saveHistory();
        this.sendToRenderer("history-updated", this.history);

        return id;
      }
    );

    ipcMain.handle("delete-history-entry", async (_, id: string) => {
      const index = this.history.findIndex((entry) => entry.id === id);
      if (index === -1) {
        return false;
      }

      const entry = this.history[index];

      // Delete associated audio file if it exists
      if (entry.audioFilePath && fs.existsSync(entry.audioFilePath)) {
        try {
          await fs.unlink(entry.audioFilePath);
        } catch (error) {
          handleErrorSilently(error, "Failed to delete audio file");
        }
      }

      this.history.splice(index, 1);
      this.saveHistory();
      this.sendToRenderer("history-updated", this.history);

      return true;
    });

    ipcMain.handle("check-history-buffer-reduction", (_, newMaxEntries: number) => {
      // Get the latest count directly from the history file
      let currentCount = 0;
      try {
        if (fs.existsSync(this.historyPath)) {
          const rawHistory = fs.readJsonSync(this.historyPath);
          currentCount = rawHistory.length;
        }
      } catch (error) {
        currentCount = 0;
      }
      
      if (currentCount > newMaxEntries) {
        return {
          wouldDelete: true,
          deleteCount: currentCount - newMaxEntries,
          currentCount
        };
      }
      return { wouldDelete: false };
    });

    ipcMain.handle("clear-history", async () => {
      // Delete all associated audio files
      for (const entry of this.history) {
        if (entry.audioFilePath && fs.existsSync(entry.audioFilePath)) {
          try {
            await fs.unlink(entry.audioFilePath);
          } catch (error) {
            handleErrorSilently(error, "Failed to delete audio file");
          }
        }
      }

      this.history = [];
      this.saveHistory();
      this.sendToRenderer("history-updated", this.history);
    });

    // Global state management
    ipcMain.handle("get-app-state", () => {
      return {
        currentState: this.currentState,
        isRecording: this.isRecording,
        selectedAgent: this.selectedAgent,
      };
    });

    ipcMain.handle("set-selected-agent", (_, agentId: string) => {
      this.setSelectedAgent(agentId);
      return true;
    });

    ipcMain.handle("set-recording-state", (_, isRecording: boolean) => {
      this.setRecordingState(isRecording);
      return true;
    });

    // Recording service state notifications
    ipcMain.handle(
      "notify-recording-state-change",
      (_, recordingState: string) => {
        this.handleRecordingStateChange(recordingState);
      }
    );

    ipcMain.handle("notify-transcription-complete", (_, result: STTResult) => {
      this.handleTranscriptionComplete(result);
    });

    // Window management
    ipcMain.handle("show-settings-window", () => {
      this.showSettingsWindow();
    });

    ipcMain.handle("hide-settings-window", () => {
      if (this.settingsWindow) {
        this.settingsWindow.hide();
      }
    });

    ipcMain.handle("hide-bar-window", () => {
      if (this.barWindow) {
        this.barWindow.hide();
      }
    });

    ipcMain.handle("show-bar-window", () => {
      if (this.barWindow) {
        this.barWindow.show();
      } else {
        this.createBarWindow();
      }
    });

    // Show context menu for bar window
    ipcMain.handle("show-bar-context-menu", () => {
      const agents = this.settingsService.getEnabledAgents();
      const currentSelectedAgentId = this.selectedAgent;
      const selectedAgent = this.settingsService
        .getSettings()
        .agents.find((a) => a.id === currentSelectedAgentId);

      const template: Electron.MenuItemConstructorOptions[] = [];

      // Add agent selection if available
      if (agents.length > 0) {
        template.push({ label: "AGENTS", enabled: false });
        agents.forEach((agent) => {
          template.push({
            label: agent.name,
            type: "radio",
            checked: selectedAgent?.id === agent.id,
            click: () => {
              this.setSelectedAgent(agent.id);
            },
          });
        });
        template.push({ type: "separator" });
      }

      // Add menu actions
      template.push({
        label: mainT("menu.openSettings"),
        accelerator: SHORTCUTS.OPEN_SETTINGS,
        click: () => {
          this.showSettingsWindow();
        },
      });

      template.push({
        label: mainT("menu.hideToolbar"),
        click: () => {
          if (this.barWindow) {
            this.barWindow.hide();
          }
        },
      });

      const contextMenu = Menu.buildFromTemplate(template);
      if (this.barWindow) {
        contextMenu.popup({ window: this.barWindow });
      }
    });

    // setIgnoreMouseEvents対応
    ipcMain.on("set-ignore-mouse-events", (_, ignore: boolean) => {
      if (this.barWindow) {
        this.barWindow.setIgnoreMouseEvents(ignore, { forward: true });
      }
    });

    // Cursor state detection and auto-paste
    ipcMain.handle("check-cursor-state", async () => {
      return this.checkCursorState();
    });

    ipcMain.handle("paste-text", async (_, text: string) => {
      return this.pasteText(text);
    });

    ipcMain.handle("show-result-window", () => {
      this.showResultWindow();
    });

    ipcMain.handle("close-result-window", () => {
      if (this.resultWindow) {
        this.resultWindow.close();
      }
    });

    // Handle auto-paste for transcription results (without LLM processing)
    ipcMain.handle("auto-paste-transcription", async (_, text: string) => {
      try {
        await this.handleProcessingComplete(text, text);
        return { success: true };
      } catch (error) {
        return { success: false, error: getErrorMessage(error) };
      }
    });

    // Handle LLM result from renderer
    ipcMain.on("notify-llm-result", (_, result: ProcessingResult) => {
      this.currentLlmResult = result;
      this.sendToRenderer("llm-result", result);
    });

    // Handle audio level for window frame animation
    ipcMain.on("notify-audio-level", (_, level: number) => {
      this.applyWindowFrameAnimation(level);
    });

    // Language update handler
    ipcMain.on("update-main-language", (_, language: "en" | "ja") => {
      currentMainLanguage = language;
      this.updateTrayMenu();
    });

    // App restart handler
    ipcMain.handle("restart-app", () => {
      app.relaunch();
      app.quit();
    });
  }

  /**
   * Sets the application state and notifies all windows
   * @param newState - The new application state
   */
  private setAppState(newState: AppState): void {
    this.currentState = newState;
    this.sendToRenderer("state-changed", newState);
    this.sendToRenderer("app-state-updated", {
      currentState: this.currentState,
      isRecording: this.isRecording,
      selectedAgent: this.selectedAgent,
    });
  }

  /**
   * Sets the recording state and notifies all windows
   * @param isRecording - The new recording state
   */
  private setRecordingState(isRecording: boolean): void {
    this.isRecording = isRecording;
    this.sendToRenderer("recording-state-changed", isRecording);
    this.sendToRenderer("app-state-updated", {
      currentState: this.currentState,
      isRecording: this.isRecording,
      selectedAgent: this.selectedAgent,
    });
  }

  /**
   * Sets the selected agent and notifies all windows
   * @param agentId - The selected agent ID
   */
  private setSelectedAgent(agentId: string | null): void {
    this.selectedAgent = agentId;
    this.sendToRenderer("selected-agent-changed", agentId);
    this.sendToRenderer("app-state-updated", {
      currentState: this.currentState,
      isRecording: this.isRecording,
      selectedAgent: this.selectedAgent,
    });
  }

  /**
   * Handles recording service state changes and updates app state accordingly
   * @param recordingState - The recording service state
   */
  private handleRecordingStateChange(recordingState: string): void {
    switch (recordingState) {
      case "RECORDING":
        this.setRecordingState(true);
        this.setAppState(AppState.RECORDING);
        break;
      case "PROCESSING":
        this.setRecordingState(false);
        this.setAppState(AppState.PROCESSING_STT);
        // Reset window animation when recording stops
        this.resetWindowFrameAnimation();
        break;
      case "IDLE":
        this.setRecordingState(false);
        // Only set to IDLE if we were processing
        if (
          this.currentState === AppState.PROCESSING_STT ||
          this.currentState === AppState.RECORDING
        ) {
          this.setAppState(AppState.IDLE);
        }
        // Reset window animation when back to idle
        this.resetWindowFrameAnimation();
        break;
      case "ERROR":
        this.setRecordingState(false);
        this.setAppState(AppState.ERROR);
        // Reset window animation on error
        this.resetWindowFrameAnimation();


        // Auto return to IDLE after showing error (3 seconds to match RecordingService)
        setTimeout(() => {
          this.setAppState(AppState.IDLE);
        }, 3000);
        break;
      default:
    }
  }

  /**
   * Handles transcription completion from recording service
   * @param result - The transcription result
   */
  private handleTranscriptionComplete(result: STTResult): void {
    // Store current STT result
    this.currentSttResult = result;

    // Send transcription result to all windows
    this.sendToRenderer("stt-result", result);

    // Set state to show transcription is ready for processing
    this.setAppState(AppState.IDLE);
  }

  /**
   * Check if the system is currently in a text input state
   * @returns Promise<boolean> - True if cursor is in a text input field
   */
  private async checkCursorState(): Promise<boolean> {
    return this.cursorStateManager.checkCursorState();
  }

  /**
   * Paste text to the currently active application
   * @param text - Text to paste
   * @returns Promise<boolean> - True if paste was successful
   */
  private async pasteText(text: string): Promise<boolean> {
    return this.cursorStateManager.pasteText(text);
  }

  /**
   * Get information about the currently active window
   * @returns Promise with app name and window title, or null if unavailable
   */
  private async getActiveWindowInfo(): Promise<{ appName: string; windowTitle: string } | null> {
    return this.cursorStateManager.getActiveWindowInfo();
  }

  /**
   * Handle processing completion and decide between auto-paste or result window
   * @param result - The processing result (LLM response)
   * @param originalText - The original input text (STT result)
   */
  private async handleProcessingComplete(result: string, originalText: string): Promise<void> {
    try {
      // Check if auto-paste is enabled in settings
      const settings = this.settingsService.getSettings();
      if (!settings.autoPaste) {
        // Auto-paste disabled, always show result window
        this.showResultWindow();
        return;
      }

      // Get active window info to check if it's our own app
      const activeWindowInfo = await this.getActiveWindowInfo();
      
      // Don't auto-paste if our own app is active
      if (activeWindowInfo?.appName && 
          (activeWindowInfo.appName.toLowerCase().includes('aria') || 
           activeWindowInfo.appName.toLowerCase().includes('aura'))) {
        this.showResultWindow();
        return;
      }

      // Check if cursor is in a text input state
      const isTextInputActive = await this.checkCursorState();
      
      if (isTextInputActive) {
        // Auto-paste the result
        const pasteSuccess = await this.pasteText(result);
        
        if (pasteSuccess) {
          console.log("Auto-pasted result to active application");
          // Store in history but don't show result window
          await this.addToHistory(originalText, result);
        } else {
          // Fallback to result window if paste failed
          console.log("Auto-paste failed, showing result window");
          this.showResultWindow();
        }
      } else {
        // Show result window if not in text input state
        this.showResultWindow();
      }
    } catch (error) {
      console.error("Error in handleProcessingComplete:", error);
      // Fallback to result window on error
      this.showResultWindow();
    }
  }

  /**
   * Add entry to history
   * @param transcription - The original transcription
   * @param response - The AI response
   */
  private async addToHistory(transcription: string, response: string): Promise<void> {
    try {
      const selectedAgent = this.settingsService.getAgent(this.selectedAgent || "");
      const id = generateId();
      const historyEntry: HistoryEntry = {
        id,
        agentId: this.selectedAgent || "",
        agentName: selectedAgent?.name || "Unknown",
        transcription,
        response,
        timestamp: new Date(),
        agentAutoProcessAi: selectedAgent?.autoProcessAi || false,
      };

      this.history.unshift(historyEntry);

      // Check if history exceeds max entries and remove old entries
      const settings = this.settingsService.getSettings();
      const maxEntries = settings?.maxHistoryEntries || 100;
      if (this.history.length > maxEntries) {
        const entriesToRemove = this.history.splice(maxEntries);
        
        // Delete associated audio files for removed entries
        for (const removedEntry of entriesToRemove) {
          if (removedEntry.audioFilePath && fs.existsSync(removedEntry.audioFilePath)) {
            try {
              await fs.unlink(removedEntry.audioFilePath);
            } catch (error) {
              console.error("Failed to delete audio file:", error);
            }
          }
        }
      }

      this.saveHistory();
      this.sendToRenderer("history-updated", this.history);
    } catch (error) {
      console.error("Failed to add to history:", error);
    }
  }

  /**
   * Sends data to renderer processes via IPC channel
   * @param channel - The IPC channel name
   * @param data - Data to send to renderer
   */
  private sendToRenderer(channel: string, data: unknown): void {
    // Send to bar window
    if (this.barWindow && !this.barWindow.isDestroyed()) {
      this.barWindow.webContents.send(channel, data);
    }
    // Send to settings window if open
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send(channel, data);
    }
    // Send to result window if open
    if (this.resultWindow && !this.resultWindow.isDestroyed()) {
      this.resultWindow.webContents.send(channel, data);
    }
  }

  /**
   * Loads history entries from the history file
   */
  private async loadHistory(): Promise<void> {
    try {
      if (fs.existsSync(this.historyPath)) {
        const rawHistory = fs.readJsonSync(this.historyPath);
        // Convert timestamp strings back to Date objects
        this.history = rawHistory.map(
          (entry: HistoryEntry & { timestamp: string }) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          })
        );
        
        // Check if loaded history exceeds max entries
        const maxEntries = this.settings?.maxHistoryEntries || 100;
        if (this.history.length > maxEntries) {
          const entriesToRemove = this.history.splice(maxEntries);
          
          // Delete associated audio files for removed entries
          for (const removedEntry of entriesToRemove) {
            if (removedEntry.audioFilePath && fs.existsSync(removedEntry.audioFilePath)) {
              try {
                await fs.unlink(removedEntry.audioFilePath);
              } catch (error) {
                console.error("Failed to delete audio file:", error);
              }
            }
          }
          
          // Save the trimmed history
          this.saveHistory();
        }
      }
    } catch (error) {
      this.history = [];
    }
  }

  /**
   * Saves history entries to the history file
   */
  private saveHistory(): void {
    fs.writeJsonSync(this.historyPath, this.history, { spaces: 2 });
  }

  /**
   * Creates the floating bar window that appears full height on the right side of the screen
   */
  private createBarWindow(): void {
    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;

    // Calculate position for bottom right corner
    // Use workAreaSize to avoid clipping behind dock/taskbar
    const windowWidth = WINDOW_CONFIG.BAR.WIDTH;
    const windowHeight = WINDOW_CONFIG.BAR.HEIGHT;
    const windowX = screenWidth - windowWidth - WINDOW_CONFIG.BAR.OFFSET;
    const windowY = screenHeight - windowHeight - WINDOW_CONFIG.BAR.OFFSET;

    // Create small floating window positioned at bottom right corner
    this.barWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: windowX,
      y: windowY,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      resizable: false,
      movable: false,
      alwaysOnTop: false,
      skipTaskbar: true,
      transparent: true,
      hasShadow: false,
      show: false,
      backgroundColor: "#00000000", // Fully transparent
      roundedCorners: true,
      titleBarStyle: "hidden",
      minimizable: false,
      maximizable: false,
      closable: false,
      fullscreenable: false,
      simpleFullscreen: false,
      hiddenInMissionControl: true,
    });

    // Set window level for macOS - simplified approach
    if (process.platform === "darwin") {
      // Normal window level
      this.barWindow.setAlwaysOnTop(false);
      this.barWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });

      // Additional macOS specific settings
      this.barWindow.setWindowButtonVisibility(false);
    } else {
      // Windows specific settings
      this.barWindow.setAlwaysOnTop(false);
    }

    // Set up periodic checks to ensure window stays visible on all platforms
    this.setupWindowVisibilityCheck();

    // Load the bar interface
    if (process.env.NODE_ENV === "development") {
      this.barWindow.loadURL("http://localhost:5173/?mode=bar");
    } else {
      this.barWindow.loadFile(
        path.join(__dirname, "../renderer/main_window/index.html"),
        {
          query: { mode: "bar" },
        }
      );
    }

    // Show window when ready
    this.barWindow.once("ready-to-show", () => {
      this.barWindow?.show();

      // Force window to front on macOS
      if (process.platform === "darwin" && this.barWindow) {
        this.barWindow.focus();
        setTimeout(() => {
          if (this.barWindow && !this.barWindow.isDestroyed()) {
            this.barWindow.blur();
          }
        }, 100);
      }
    });

    // Prevent closing with system close button
    this.barWindow.on("close", (event) => {
      event.preventDefault();
      // Hide instead of closing
      this.barWindow?.hide();
    });

    // Handle window closed (only when explicitly destroyed)
    this.barWindow.on("closed", () => {
      this.barWindow = null;
    });
  }

  /**
   * Creates the settings window for app configuration
   */
  private createSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: WINDOW_CONFIG.SETTINGS.WIDTH,
      height: WINDOW_CONFIG.SETTINGS.HEIGHT,
      minWidth: WINDOW_CONFIG.SETTINGS.MIN_WIDTH,
      minHeight: WINDOW_CONFIG.SETTINGS.MIN_HEIGHT,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      titleBarStyle: "default",
      show: false,
      modal: false,
      parent: this.barWindow || undefined,
    });

    // Load the settings interface
    if (process.env.NODE_ENV === "development") {
      this.settingsWindow.loadURL("http://localhost:5173/?mode=settings");
    } else {
      this.settingsWindow.loadFile(
        path.join(__dirname, "../renderer/main_window/index.html"),
        {
          query: { mode: "settings" },
        }
      );
    }

    // Show window when ready
    this.settingsWindow.once("ready-to-show", () => {
      this.settingsWindow?.show();
      this.settingsWindow?.focus();
    });

    // Handle window closed
    this.settingsWindow.on("closed", () => {
      this.settingsWindow = null;
    });
  }

  /**
   * Shows or focuses the settings window
   */
  private showSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
    } else {
      this.createSettingsWindow();
    }
  }

  /**
   * Creates the system tray icon with context menu
   */
  private createTray(): void {
    // Use the custom tray icon from assets
    // Try multiple possible paths for different environments
    const possiblePaths = [
      path.join(__dirname, "../src/assets/tray-icon.png"), // Development
      path.join(__dirname, "../../src/assets/tray-icon.png"), // Alternative dev path
      path.join(process.resourcesPath, "app", "src", "assets", "tray-icon.png"), // Production
      path.join(__dirname, "../assets/tray-icon.png"), // Fallback
    ];

    let trayIcon: Electron.NativeImage | null = null;

    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath);
        break;
      }
    }

    // Fallback to a simple built-in icon if file not found
    if (!trayIcon || trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }

    // For macOS, resize to 16x16 and set as template
    if (process.platform === "darwin") {
      trayIcon = trayIcon.resize({ width: 18, height: 18 });
      trayIcon.setTemplateImage(true);
    }

    this.tray = new Tray(trayIcon);

    this.updateTrayMenu();
    this.tray.setToolTip(
      "A.R.I.A. - Autonomous Response & Intelligence Assistant"
    );

    this.tray.on("double-click", () => {
      this.showSettingsWindow();
    });
  }

  /**
   * Updates the tray menu with current translations
   */
  private updateTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: mainT("menu.showToolbar"),
        click: () => {
          if (this.barWindow) {
            this.barWindow.show();
          }
        },
      },
      {
        label: mainT("menu.openSettings"),
        click: () => {
          this.showSettingsWindow();
        },
      },
      { type: "separator" },
      {
        label: mainT("menu.exit"),
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Registers global keyboard shortcuts for the application
   */
  private registerGlobalShortcuts(): void {
    // Register toggle bar shortcut
    globalShortcut.register(SHORTCUTS.TOGGLE_BAR, () => {
      if (this.barWindow) {
        if (this.barWindow.isVisible()) {
          this.barWindow.hide();
        } else {
          this.barWindow.show();
        }
      }
    });

    // Register agent shortcuts
    const agents = this.settingsService.getEnabledAgents();

    agents.forEach((agent) => {
      globalShortcut.register(agent.hotkey, () => {
        this.processWithAgent(agent.id);
      });
    });
  }

  /**
   * Unregisters all global keyboard shortcuts
   */
  private unregisterGlobalShortcuts(): void {
    globalShortcut.unregisterAll();
  }

  /**
   * Processes input with the specified agent
   * @param _agentId - The ID of the agent to use for processing
   */
  private processWithAgent(_agentId: string): void {
    // This would trigger the recording process for the specified agent
    // For now, we'll just show the settings window
    this.showSettingsWindow();
  }

  /**
   * Sets up periodic window visibility checks for fullscreen compatibility
   */
  private setupWindowVisibilityCheck(): void {
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
    }

    // Check every 2 seconds to ensure window stays visible
    this.visibilityCheckInterval = setInterval(() => {
      if (this.barWindow && !this.barWindow.isDestroyed()) {
        try {
          // Always ensure window is visible and on top
          if (!this.barWindow.isVisible()) {
            this.barWindow.show();
          }

          // Window level check removed - no longer always on top
        } catch (error) {
          handleErrorSilently(error, "Window visibility check failed");
        }
      }
    }, 2000);
  }

  /**
   * Initializes the application by creating windows and setting up services
   */
  public async initialize(): Promise<void> {
    // Load history first
    await this.loadHistory();
    
    // Request accessibility permissions on macOS
    if (process.platform === "darwin") {
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        systemPreferences.isTrustedAccessibilityClient(true);
      }
    }

    // Create bar window
    this.createBarWindow();

    // Create system tray if enabled
    const settings = this.settingsService.getSettings();
    if (settings.systemTray) {
      this.createTray();
    }

    // Register global shortcuts
    this.registerGlobalShortcuts();
  }

  /**
   * Cleans up resources before application shutdown
   */
  public cleanup(): void {
    this.unregisterGlobalShortcuts();

    // Clear visibility check interval
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
    }

    if (this.tray) {
      this.tray.destroy();
    }

    // Force close bar window on app quit
    if (this.barWindow && !this.barWindow.isDestroyed()) {
      this.barWindow.destroy();
    }

    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.destroy();
    }

    if (this.resultWindow && !this.resultWindow.isDestroyed()) {
      this.resultWindow.destroy();
    }
  }

  /**
   * Check if the system cursor is in an input state (text field focused)
   */
  private async checkCursorState(): Promise<boolean> {
    try {
      // Get the currently focused application
      if (process.platform === "darwin") {
        // On macOS, we can use AppleScript to check if current app has text input focus
        try {
          const script = `
            tell application "System Events"
              set frontApp to name of first application process whose frontmost is true
              set focusedElement to focused element of application process frontApp
              if focusedElement is not missing value then
                set elementRole to role of focusedElement
                if elementRole is in {"AXTextField", "AXTextArea", "AXComboBox"} then
                  return "true"
                end if
              end if
              return "false"
            end tell
          `;
          const result = execSync(`osascript -e '${script}'`, {
            encoding: "utf8",
          }).trim();
          const isInputFocused = result === "true";
          return isInputFocused;
        } catch (error) {
          return false;
        }
      } else if (process.platform === "win32") {
        // On Windows, we can use native APIs to check if current window has text input
        // For now, we'll return false as a fallback
        return false;
      } else {
        // Linux - return false as fallback
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Paste text to the currently focused application
   */
  private async pasteText(text: string): Promise<boolean> {
    try {
      // Copy text to clipboard first
      clipboard.writeText(text);

      // Simulate Cmd+V (or Ctrl+V on Windows/Linux)
      if (process.platform === "darwin") {
        execSync(
          `osascript -e 'tell application "System Events" to keystroke "v" using command down'`
        );
      } else {
        // For Windows/Linux, we would need additional native modules
        // For now, just copy to clipboard
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Show the result window with processing results
   */
  private showResultWindow(): void {
    if (this.resultWindow && !this.resultWindow.isDestroyed()) {
      this.resultWindow.focus();
      return;
    }

    this.resultWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      frame: true,
      resizable: true,
      minimizable: true,
      maximizable: false,
      fullscreenable: false,
      titleBarStyle: "default",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });

    // Load the result interface
    if (process.env.NODE_ENV === "development") {
      this.resultWindow.loadURL("http://localhost:5173/?mode=result");
    } else {
      this.resultWindow.loadFile(
        path.join(__dirname, "../renderer/main_window/index.html"),
        {
          query: { mode: "result" },
        }
      );
    }

    this.resultWindow.once("ready-to-show", () => {
      if (this.resultWindow) {
        this.resultWindow.show();
        this.resultWindow.focus();

        // Send current STT and LLM results to the result window
        if (this.currentSttResult) {
          this.resultWindow.webContents.send(
            "stt-result",
            this.currentSttResult
          );
        }
        if (this.currentLlmResult) {
          this.resultWindow.webContents.send(
            "llm-result",
            this.currentLlmResult
          );
        }
      }
    });

    this.resultWindow.on("closed", () => {
      this.resultWindow = null;
    });

    // Center the window on the screen
    this.resultWindow.center();
  }

  /**
   * Applies window frame animation based on audio level
   * @param level - Audio level from 0 to 1
   */
  private applyWindowFrameAnimation(level: number): void {
    if (!this.barWindow || this.barWindow.isDestroyed()) {
      return;
    }

    // Calculate scale factor based on audio level
    // Base size + audio level scaled to a reasonable range
    const baseScale = 1.0;
    const maxScale = 1.2; // Maximum 20% size increase
    const scale = baseScale + level * (maxScale - baseScale);

    // Calculate opacity pulse based on audio level
    const baseOpacity = 1.0;
    const minOpacity = 0.8;
    const opacity = baseOpacity - level * (baseOpacity - minOpacity);

    try {
      // Get current window bounds and screen dimensions
      const bounds = this.barWindow.getBounds();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
      const originalWidth = WINDOW_CONFIG.BAR.WIDTH;
      const originalHeight = WINDOW_CONFIG.BAR.HEIGHT;

      // Calculate new size
      const newWidth = Math.round(originalWidth * scale);
      const newHeight = Math.round(originalHeight * scale);

      // Calculate position to keep window at bottom right corner
      const newX = screenWidth - newWidth - WINDOW_CONFIG.BAR.OFFSET;
      const newY = screenHeight - newHeight - WINDOW_CONFIG.BAR.OFFSET;

      // Apply window transformations
      this.barWindow.setBounds(
        {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        },
        false
      );

      // Apply opacity animation
      this.barWindow.setOpacity(opacity);
    } catch (error) {
      handleErrorSilently(error, "Failed to apply window frame animation");
    }
  }

  /**
   * Resets window frame animation to original state
   */
  private resetWindowFrameAnimation(): void {
    if (!this.barWindow || this.barWindow.isDestroyed()) {
      return;
    }

    try {
      // Get screen dimensions for positioning
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } =
        primaryDisplay.workAreaSize;

      // Calculate original position for bottom right corner
      const windowWidth = WINDOW_CONFIG.BAR.WIDTH;
      const windowHeight = WINDOW_CONFIG.BAR.HEIGHT;
      const windowX = screenWidth - windowWidth - WINDOW_CONFIG.BAR.OFFSET;
      const windowY = screenHeight - windowHeight - WINDOW_CONFIG.BAR.OFFSET;

      // Reset to original size and position
      this.barWindow.setBounds(
        {
          x: windowX,
          y: windowY,
          width: windowWidth,
          height: windowHeight,
        },
        false
      );

      // Reset opacity
      this.barWindow.setOpacity(1.0);
    } catch (error) {
      handleErrorSilently(error, "Failed to reset window frame animation");
    }
  }
}

// Initialize the app
const ariaApp = new AriaApp();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  ariaApp.initialize();
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    ariaApp.initialize();
  }
});

app.on("before-quit", () => {
  ariaApp.cleanup();
});

// Security: Prevent new window creation
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});
