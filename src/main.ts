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

import { APP_CONFIG, SHORTCUTS, WINDOW_CONFIG } from "./constants/app";
import { LLMService } from "./services/llm";
import { SettingsService } from "./services/settings";
import { AppState, HistoryEntry } from "./types";
import { getErrorMessage } from "./utils/errors";
import { generateId } from "./utils/helpers";

/**
 * Main application class that manages Electron windows, services, and IPC communication
 */
class AuraApp {
  /** Bar window instance for floating button */
  private barWindow: BrowserWindow | null = null;

  /** Settings window instance for configuration */
  private settingsWindow: BrowserWindow | null = null;

  /** System tray instance */
  private tray: Tray | null = null;

  /** Settings service for managing app configuration */
  private settingsService: SettingsService;

  /** LLM service for AI processing */
  private llmService: LLMService;

  /** Current application state */
  private currentState: AppState = AppState.IDLE;

  /** Path to history file */
  private historyPath: string;

  /** Path to audio recordings directory */
  private audioDirectory: string;

  /** In-memory history entries */
  private history: HistoryEntry[] = [];

  /** Timer for window visibility checks */
  private visibilityCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.settingsService = new SettingsService();
    this.llmService = new LLMService();

    const configDir = path.join(os.homedir(), APP_CONFIG.CONFIG_DIR);
    this.historyPath = path.join(configDir, APP_CONFIG.FILES.HISTORY);
    this.audioDirectory = path.join(configDir, APP_CONFIG.FILES.RECORDINGS_DIR);

    fs.ensureDirSync(configDir);
    fs.ensureDirSync(this.audioDirectory);
    this.loadHistory();
    const apiKey = this.settingsService.getApiKey();
    if (apiKey) {
      this.llmService.initializeOpenAI(apiKey);
    }

    this.setupIpcHandlers();
  }

  /**
   * Sets up IPC handlers for communication between main and renderer processes
   */
  private setupIpcHandlers(): void {
    ipcMain.handle("get-settings", () => {
      return this.settingsService.getSettings();
    });

    ipcMain.handle("update-settings", (_, settings) => {
      this.settingsService.updateSettings(settings);
      if (settings.openaiApiKey) {
        this.llmService.initializeOpenAI(settings.openaiApiKey);
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
        const agent = this.settingsService.getAgent(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        this.currentState = AppState.PROCESSING_LLM;
        this.sendToRenderer("state-changed", this.currentState);

        const llmResult = await this.llmService.processText(text, agent);

        this.currentState = AppState.COMPLETED;
        this.sendToRenderer("state-changed", this.currentState);

        return { success: true, result: llmResult };
      } catch (error) {
        this.currentState = AppState.ERROR;
        this.sendToRenderer("state-changed", this.currentState);
        const errorMessage = getErrorMessage(error);
        return { success: false, error: errorMessage };
      }
    });

    // Audio file saving
    ipcMain.handle("save-audio-file", async (_, { data, mimeType }) => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = mimeType.includes("webm") ? "webm" : "wav";
        const filename = `recording-${timestamp}.${extension}`;
        const filePath = path.join(this.audioDirectory, filename);

        // Convert number array back to buffer
        const buffer = Buffer.from(data);

        await fs.writeFile(filePath, buffer);

        console.log("💾 Audio file saved:", {
          path: filePath,
          size: buffer.length,
          sizeKB: Math.round(buffer.length / 1024),
        });

        return { filePath };
      } catch (error) {
        console.error("Failed to save audio file:", error);
        throw error;
      }
    });

    // History management
    ipcMain.handle("get-history", () => {
      return this.history;
    });

    ipcMain.handle(
      "add-history-entry",
      (_, entry: Omit<HistoryEntry, "id">) => {
        const id = generateId();
        const historyEntry: HistoryEntry = { id, ...entry };

        this.history.unshift(historyEntry); // Add to beginning
        this.saveHistory();

        console.log("📝 Added history entry:", {
          id,
          agentName: entry.agentName,
          transcriptionLength: entry.transcription.length,
          hasAudioFile: !!entry.audioFilePath,
        });

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
          console.log(`🗑️ Deleted audio file: ${entry.audioFilePath}`);
        } catch (error) {
          console.warn("Failed to delete audio file:", error);
        }
      }

      this.history.splice(index, 1);
      this.saveHistory();

      console.log(`🗑️ Deleted history entry: ${id}`);
      return true;
    });

    ipcMain.handle("clear-history", async () => {
      // Delete all associated audio files
      for (const entry of this.history) {
        if (entry.audioFilePath && fs.existsSync(entry.audioFilePath)) {
          try {
            await fs.unlink(entry.audioFilePath);
          } catch (error) {
            console.warn("Failed to delete audio file:", error);
          }
        }
      }

      this.history = [];
      this.saveHistory();
      console.log("🧹 Cleared all history");
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
      const selectedAgent = this.settingsService
        .getSettings()
        .agents.find((a) => a.enabled);

      const template: Electron.MenuItemConstructorOptions[] = [];

      // Add agent selection if available
      if (agents.length > 0) {
        template.push({ label: "エージェント", enabled: false });
        agents.forEach((agent) => {
          template.push({
            label: agent.name,
            type: "radio",
            checked: selectedAgent?.id === agent.id,
            click: () => {
              this.sendToRenderer("select-agent", agent.id);
            },
          });
        });
        template.push({ type: "separator" });
      }

      // Add menu actions
      template.push({
        label: "設定を開く",
        accelerator: SHORTCUTS.OPEN_SETTINGS,
        click: () => {
          this.showSettingsWindow();
        },
      });

      template.push({
        label: "ツールバーを隠す",
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
  }

  /**
   * Loads history entries from the history file
   */
  private loadHistory(): void {
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
        console.log(`📚 Loaded ${this.history.length} history entries`);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
      this.history = [];
    }
  }

  /**
   * Saves history entries to the history file
   */
  private saveHistory(): void {
    try {
      fs.writeJsonSync(this.historyPath, this.history, { spaces: 2 });
      console.log(`💾 Saved ${this.history.length} history entries`);
    } catch (error) {
      console.error("Failed to save history:", error);
      throw error;
    }
  }

  /**
   * Creates the floating bar window that appears at the bottom right of the screen
   */
  private createBarWindow(): void {
    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;
    const bounds = primaryDisplay.bounds;

    // Calculate position more precisely for bottom-right corner
    // Use bounds instead of workAreaSize for more accurate positioning
    const windowX = bounds.width - WINDOW_CONFIG.BAR.WIDTH - WINDOW_CONFIG.BAR.OFFSET;
    const windowY = bounds.height - WINDOW_CONFIG.BAR.HEIGHT - WINDOW_CONFIG.BAR.OFFSET;

    console.log("🖥️ Screen info:", {
      workAreaSize: { width: screenWidth, height: screenHeight },
      bounds: bounds,
      windowSize: { width: WINDOW_CONFIG.BAR.WIDTH, height: WINDOW_CONFIG.BAR.HEIGHT },
      offset: WINDOW_CONFIG.BAR.OFFSET,
      calculatedPosition: { x: windowX, y: windowY },
      distanceFromEdge: WINDOW_CONFIG.BAR.OFFSET
    });

    // Create minimal floating window (just for the button) - position at bottom right
    this.barWindow = new BrowserWindow({
      width: WINDOW_CONFIG.BAR.WIDTH,
      height: WINDOW_CONFIG.BAR.HEIGHT,
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
      alwaysOnTop: true,
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
      // Use a more stable window level
      this.barWindow.setAlwaysOnTop(true, "floating", 1);
      this.barWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });

      // Additional macOS specific settings
      this.barWindow.setWindowButtonVisibility(false);
    } else {
      // Windows specific settings for always on top
      this.barWindow.setAlwaysOnTop(true, "normal");
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

    // DevTools can be opened manually if needed
    // if (process.env.NODE_ENV === 'development') {
    //   this.barWindow.webContents.openDevTools();
    // }
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

    // DevTools can be opened manually if needed
    // if (process.env.NODE_ENV === 'development') {
    //   this.settingsWindow.webContents.openDevTools();
    // }
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
        console.log("Using tray icon from:", iconPath);
        break;
      }
    }

    // Fallback to a simple built-in icon if file not found
    if (!trayIcon || trayIcon.isEmpty()) {
      console.warn("Tray icon file not found, using fallback");
      trayIcon = nativeImage.createEmpty();
    }

    // For macOS, resize to 16x16 and set as template
    if (process.platform === "darwin") {
      trayIcon = trayIcon.resize({ width: 18, height: 18 });
      trayIcon.setTemplateImage(true);
    }

    this.tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "ツールバーを表示",
        click: () => {
          if (this.barWindow) {
            this.barWindow.show();
          }
        },
      },
      {
        label: "設定を開く",
        click: () => {
          this.showSettingsWindow();
        },
      },
      { type: "separator" },
      {
        label: "終了",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip("Aura - AI Voice Assistant");

    this.tray.on("double-click", () => {
      this.showSettingsWindow();
    });
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
   * @param agentId - The ID of the agent to use for processing
   */
  private processWithAgent(agentId: string): void {
    // This would trigger the recording process for the specified agent
    console.log(`Processing with agent: ${agentId}`);
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

          // Re-apply window level
          if (process.platform === "darwin") {
            this.barWindow.setAlwaysOnTop(true, "floating", 1);
          } else {
            this.barWindow.setAlwaysOnTop(true, "normal");
          }
        } catch (error) {
          console.warn("Failed to maintain window visibility:", error);
        }
      }
    }, 2000);
  }

  /**
   * Initializes the application by creating windows and setting up services
   */
  public async initialize(): Promise<void> {
    // Request accessibility permissions on macOS
    if (process.platform === "darwin") {
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        console.log("Requesting accessibility permissions...");
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
  }
}

// Initialize the app
const auraApp = new AuraApp();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  auraApp.initialize();
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
    auraApp.initialize();
  }
});

app.on("before-quit", () => {
  auraApp.cleanup();
});

// Security: Prevent new window creation
app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
});
