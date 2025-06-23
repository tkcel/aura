import * as os from 'os';
import * as path from 'path';

import * as fs from 'fs-extra';

import { DEFAULT_AGENTS } from '../config/default-agents';
import { AppSettings } from '../types';

export class SettingsService {
  private settingsPath: string;
  private settings: AppSettings;

  constructor() {
    const configDir = path.join(os.homedir(), '.aura');
    this.settingsPath = path.join(configDir, 'settings.json');
    this.ensureConfigDir();
    this.settings = this.loadSettings();
  }

  private ensureConfigDir(): void {
    const configDir = path.dirname(this.settingsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  private getDefaultSettings(): AppSettings {
    return {
      openaiApiKey: '',
      language: 'auto',
      agents: DEFAULT_AGENTS,
      autoStartup: false,
      systemTray: true,
      soundNotifications: true,
      saveAudioFiles: false,
      maxHistoryEntries: 100
    };
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const rawSettings = fs.readJsonSync(this.settingsPath);
        return { ...this.getDefaultSettings(), ...rawSettings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return this.getDefaultSettings();
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  public saveSettings(): void {
    fs.writeJsonSync(this.settingsPath, this.settings, { spaces: 2 });
  }

  public getApiKey(): string {
    return this.settings.openaiApiKey;
  }

  public setApiKey(apiKey: string): void {
    this.settings.openaiApiKey = apiKey;
    this.saveSettings();
  }

  public getEnabledAgents() {
    return this.settings.agents.filter(agent => agent.enabled);
  }

  public getAgent(id: string) {
    return this.settings.agents.find(agent => agent.id === id);
  }

  public updateAgent(id: string, updates: Partial<typeof DEFAULT_AGENTS[0]>): void {
    const agentIndex = this.settings.agents.findIndex(agent => agent.id === id);
    if (agentIndex !== -1) {
      this.settings.agents[agentIndex] = { ...this.settings.agents[agentIndex], ...updates };
      this.saveSettings();
    }
  }

  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }
}