import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard, nativeImage, shell, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import started from 'electron-squirrel-startup';
import { SettingsService } from './services/settings';
import { LLMService } from './services/llm';
import { AppState, HistoryEntry } from './types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

class AuraApp {
  private barWindow: BrowserWindow | null = null;
  private settingsWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private settingsService: SettingsService;
  private llmService: LLMService;
  private currentState: AppState = AppState.IDLE;
  private historyPath: string;
  private audioDirectory: string;
  private history: HistoryEntry[] = [];

  constructor() {
    this.settingsService = new SettingsService();
    this.llmService = new LLMService();

    const configDir = path.join(os.homedir(), '.aura');
    this.historyPath = path.join(configDir, 'history.json');
    this.audioDirectory = path.join(configDir, 'recordings');
    
    fs.ensureDirSync(configDir);
    fs.ensureDirSync(this.audioDirectory);
    this.loadHistory();
    const apiKey = this.settingsService.getApiKey();
    if (apiKey) {
      this.llmService.initializeOpenAI(apiKey);
    }

    this.setupIpcHandlers();
  }


  private setupIpcHandlers(): void {
    ipcMain.handle('get-settings', () => {
      return this.settingsService.getSettings();
    });

    ipcMain.handle('update-settings', (_, settings) => {
      this.settingsService.updateSettings(settings);
      if (settings.openaiApiKey) {
        this.llmService.initializeOpenAI(settings.openaiApiKey);
      }
      return true;
    });

    ipcMain.handle('copy-to-clipboard', (_, text) => {
      clipboard.writeText(text);
      return true;
    });

    ipcMain.handle('open-external', async (_, filePath) => {
      await shell.openPath(filePath);
    });

    // API operations
    ipcMain.handle('test-api-connection', async () => {
      try {
        const isConnected = await this.llmService.testConnection();
        return { success: true, connected: isConnected };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    });

    // Process with LLM only
    ipcMain.handle('process-with-llm', async (_, { text, agentId }) => {
      try {
        const agent = this.settingsService.getAgent(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        this.currentState = AppState.PROCESSING_LLM;
        this.sendToRenderer('state-changed', this.currentState);

        const llmResult = await this.llmService.processText(text, agent);

        this.currentState = AppState.COMPLETED;
        this.sendToRenderer('state-changed', this.currentState);

        return { success: true, result: llmResult };
      } catch (error) {
        this.currentState = AppState.ERROR;
        this.sendToRenderer('state-changed', this.currentState);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    });

    // Audio file saving
    ipcMain.handle('save-audio-file', async (_, { data, mimeType }) => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = mimeType.includes('webm') ? 'webm' : 'wav';
        const filename = `recording-${timestamp}.${extension}`;
        const filePath = path.join(this.audioDirectory, filename);
        
        // Convert number array back to buffer
        const buffer = Buffer.from(data);
        
        await fs.writeFile(filePath, buffer);
        
        console.log('💾 Audio file saved:', {
          path: filePath,
          size: buffer.length,
          sizeKB: Math.round(buffer.length / 1024)
        });
        
        return { filePath };
      } catch (error) {
        console.error('Failed to save audio file:', error);
        throw error;
      }
    });

    // History management
    ipcMain.handle('get-history', () => {
      return this.history;
    });

    ipcMain.handle('add-history-entry', (_, entry: Omit<HistoryEntry, 'id'>) => {
      const id = this.generateId();
      const historyEntry: HistoryEntry = { id, ...entry };
      
      this.history.unshift(historyEntry); // Add to beginning
      this.saveHistory();
      
      console.log('📝 Added history entry:', {
        id,
        agentName: entry.agentName,
        transcriptionLength: entry.transcription.length,
        hasAudioFile: !!entry.audioFilePath
      });
      
      return id;
    });

    ipcMain.handle('delete-history-entry', async (_, id: string) => {
      const index = this.history.findIndex(entry => entry.id === id);
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
          console.warn('Failed to delete audio file:', error);
        }
      }

      this.history.splice(index, 1);
      this.saveHistory();

      console.log(`🗑️ Deleted history entry: ${id}`);
      return true;
    });

    ipcMain.handle('clear-history', async () => {
      // Delete all associated audio files
      for (const entry of this.history) {
        if (entry.audioFilePath && fs.existsSync(entry.audioFilePath)) {
          try {
            await fs.unlink(entry.audioFilePath);
          } catch (error) {
            console.warn('Failed to delete audio file:', error);
          }
        }
      }

      this.history = [];
      this.saveHistory();
      console.log('🧹 Cleared all history');
    });

    // Window management
    ipcMain.handle('show-settings-window', () => {
      this.showSettingsWindow();
    });

    ipcMain.handle('hide-settings-window', () => {
      if (this.settingsWindow) {
        this.settingsWindow.hide();
      }
    });

  }


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

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyPath)) {
        const rawHistory = fs.readJsonSync(this.historyPath);
        // Convert timestamp strings back to Date objects
        this.history = rawHistory.map((entry: HistoryEntry & { timestamp: string }) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        console.log(`📚 Loaded ${this.history.length} history entries`);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      fs.writeJsonSync(this.historyPath, this.history, { spaces: 2 });
      console.log(`💾 Saved ${this.history.length} history entries`);
    } catch (error) {
      console.error('Failed to save history:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createBarWindow(): void {
    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Create bar window at bottom of screen
    const barHeight = 60;
    const barWidth = Math.min(800, screenWidth - 100);
    
    this.barWindow = new BrowserWindow({
      width: barWidth,
      height: barHeight,
      x: Math.floor((screenWidth - barWidth) / 2),
      y: screenHeight - barHeight - 10,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      show: false
    });

    // Load the bar interface
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.barWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '?mode=bar');
    } else {
      this.barWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
        query: { mode: 'bar' }
      });
    }

    // Show window when ready
    this.barWindow.once('ready-to-show', () => {
      this.barWindow?.show();
    });

    // Handle window closed
    this.barWindow.on('closed', () => {
      this.barWindow = null;
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.barWindow.webContents.openDevTools();
    }
  }

  private createSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 800,
      height: 900,
      minWidth: 600,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
      titleBarStyle: 'default',
      show: false,
      modal: false,
      parent: this.barWindow || undefined
    });

    // Load the settings interface
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.settingsWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '?mode=settings');
    } else {
      this.settingsWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
        query: { mode: 'settings' }
      });
    }

    // Show window when ready
    this.settingsWindow.once('ready-to-show', () => {
      this.settingsWindow?.show();
      this.settingsWindow?.focus();
    });

    // Handle window closed
    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.settingsWindow.webContents.openDevTools();
    }
  }

  private showSettingsWindow(): void {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
    } else {
      this.createSettingsWindow();
    }
  }

  private createTray(): void {
    // Create a simple tray icon (we'll use a basic icon for now)
    const trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1s=');
    this.tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Settings',
        click: () => {
          this.showSettingsWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Aura - AI Voice Assistant');

    this.tray.on('double-click', () => {
      this.showSettingsWindow();
    });
  }

  private registerGlobalShortcuts(): void {
    const agents = this.settingsService.getEnabledAgents();
    
    agents.forEach(agent => {
      globalShortcut.register(agent.hotkey, () => {
        this.processWithAgent(agent.id);
      });
    });
  }

  private unregisterGlobalShortcuts(): void {
    globalShortcut.unregisterAll();
  }

  private processWithAgent(_agentId: string): void {
    // This would trigger the recording process for the specified agent
    // For now, we'll just show the settings window
    this.showSettingsWindow();
  }

  public async initialize(): Promise<void> {
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

  public cleanup(): void {
    this.unregisterGlobalShortcuts();
    
    if (this.tray) {
      this.tray.destroy();
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
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    auraApp.initialize();
  }
});

app.on('before-quit', () => {
  auraApp.cleanup();
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});
