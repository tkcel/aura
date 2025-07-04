import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';

import { RecordingService, RecordingState } from '../services/recording';
import { AppSettings, ProcessingResult, STTResult, AppState, HistoryEntry, LLMResult, isLLMResult, CreateHistoryEntry, UILanguage, historyEntryToSTTResult, historyEntryToLLMResult, historyEntryToProcessingResult } from '../types';
import { validateAgentSelection } from '../utils/agent-helpers';
import { handleErrorSilently } from '../utils/error-handling';
import { setLanguage as setI18nLanguage } from '../utils/i18n';

interface AppContextState {
  settings: AppSettings | null;
  currentState: AppState;
  selectedAgent: string | null;
  isRecording: boolean;
  error: string | null;
  history: HistoryEntry[];
  pendingTranscription: string | null;
  language: UILanguage;
  audioLevel: number;
  isOnline: boolean;
}

type AppAction =
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_STATE'; payload: AppState; syncWithMain?: boolean }
  | { type: 'SELECT_AGENT'; payload: string; syncWithMain?: boolean }
  | { type: 'SET_RECORDING'; payload: boolean; syncWithMain?: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HISTORY'; payload: HistoryEntry[] }
  | { type: 'ADD_HISTORY_ENTRY'; payload: HistoryEntry }
  | { type: 'SET_PENDING_TRANSCRIPTION'; payload: string | null }
  | { type: 'SET_STATE_FROM_MAIN'; payload: AppState }
  | { type: 'SELECT_AGENT_FROM_MAIN'; payload: string }
  | { type: 'SET_RECORDING_FROM_MAIN'; payload: boolean }
  | { type: 'SET_LANGUAGE'; payload: UILanguage }
  | { type: 'SET_AUDIO_LEVEL'; payload: number }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean };

const initialState: AppContextState = {
  settings: null,
  currentState: AppState.IDLE,
  selectedAgent: null,
  isRecording: false,
  error: null,
  history: [],
  pendingTranscription: null,
  language: 'en',
  audioLevel: 0,
  isOnline: false,
};

function appReducer(state: AppContextState, action: AppAction): AppContextState {
  const newState = (() => {
    switch (action.type) {
      case 'SET_SETTINGS':
        return { ...state, settings: action.payload };
      case 'SET_STATE':
        if (state.currentState === action.payload) {
          return state;
        }
        
        return { ...state, currentState: action.payload };
      case 'SELECT_AGENT':
        return { ...state, selectedAgent: action.payload };
      case 'SET_RECORDING':
        return { ...state, isRecording: action.payload };
      case 'SET_ERROR':
        return { ...state, error: action.payload };
      case 'SET_HISTORY':
        return { ...state, history: action.payload };
      case 'ADD_HISTORY_ENTRY':
        return { ...state, history: [action.payload, ...state.history] };
      case 'SET_PENDING_TRANSCRIPTION':
        return { ...state, pendingTranscription: action.payload };
      // Actions from main process - no sync back to main needed
      case 'SET_STATE_FROM_MAIN':
        return { ...state, currentState: action.payload };
      case 'SELECT_AGENT_FROM_MAIN':
        return { ...state, selectedAgent: action.payload };
      case 'SET_RECORDING_FROM_MAIN':
        return { ...state, isRecording: action.payload };
      case 'SET_LANGUAGE':
        return { ...state, language: action.payload };
      case 'SET_AUDIO_LEVEL':
        return { ...state, audioLevel: action.payload };
      case 'SET_ONLINE_STATUS':
        return { ...state, isOnline: action.payload };
      default:
        return state;
    }
  })();


  return newState;
}

interface AppContextValue extends AppContextState {
  dispatch: React.Dispatch<AppAction>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  selectAgent: (agentId: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
  testApiConnection: () => Promise<boolean>;
  clearError: () => void;
  deleteHistoryEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  playAudioFile: (filePath: string) => void;
  processWithAi: (transcription: string) => Promise<void>;
  skipAiProcessing: () => void;
  changeLanguage: (lang: UILanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  // New methods to get current results from history
  getCurrentSTTResult: () => STTResult | null;
  getCurrentLLMResult: () => ProcessingResult | null;
  getCurrentResultMetadata: () => { agentId: string; agentName: string; timestamp: Date; audioFilePath?: string; duration?: number; agentAutoProcessAi: boolean } | null;
  sttResult: STTResult | null;
  llmResult: ProcessingResult | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const recordingService = RecordingService.getInstance();
  const stateRef = useRef(state);

  // Update state ref whenever state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize app and load settings
  useEffect(() => {
    loadSettings();
    loadHistory();
    loadInitialState();
    setupElectronListeners();
    setupRecordingService();
    setupOnlineStatusMonitoring();
  }, []);

  const loadInitialState = async () => {
    try {
      const appState = await window.electronAPI.getAppState();
      dispatch({ type: 'SET_STATE', payload: appState.currentState });
      dispatch({ type: 'SET_RECORDING', payload: appState.isRecording });
      if (appState.selectedAgent) {
        dispatch({ type: 'SELECT_AGENT', payload: appState.selectedAgent });
      }
    } catch (error) {
      handleErrorSilently(error, 'Failed to load initial state');
    }
  };

  const setupRecordingService = () => {
    recordingService.setEventHandlers({
      onStateChange: (recordingState: RecordingState) => {
        
        // RecordingService状態変更はisRecordingフラグのみ更新
        // AppStateは独立して管理
        switch (recordingState) {
          case RecordingState.RECORDING:
            dispatch({ type: 'SET_RECORDING', payload: true });
            if (stateRef.current.currentState === AppState.IDLE) {
              dispatch({ type: 'SET_STATE', payload: AppState.RECORDING });
            }
            // Results are now managed through history
            break;
          case RecordingState.PROCESSING:
            dispatch({ type: 'SET_RECORDING', payload: false });
            // RECORDING状態からRECORDING状態以外でもPROCESSING_STTに遷移
            dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_STT });
            break;
          case RecordingState.IDLE:
            dispatch({ type: 'SET_RECORDING', payload: false });
            // RecordingService.IDLEはisRecordingフラグのみ更新
            // AppStateはそのまま維持
            break;
          case RecordingState.ERROR:
            dispatch({ type: 'SET_RECORDING', payload: false });
            dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
            
            // Auto-clear error after 3 seconds to match RecordingService timeout
            setTimeout(() => {
              dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
              dispatch({ type: 'SET_ERROR', payload: null });
            }, 3000);
            break;
        }
      },
      onError: (error: Error) => {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
        dispatch({ type: 'SET_RECORDING', payload: false });
      },
      onTranscriptionComplete: (result: STTResult, audioFilePath?: string) => {
        // Notify main process about STT completion
        window.electronAPI.notifyTranscriptionComplete?.(result);
        
        // Result window already shown when recording stopped
        
        // STT完了後は明示的にLLM処理またはIDLEに遷移
        processTranscriptionResult(result, audioFilePath);
      },
      onAudioLevel: (level: number) => {
        dispatch({ type: 'SET_AUDIO_LEVEL', payload: level });
        // Send audio level to main process for window animation
        window.electronAPI.notifyAudioLevel?.(level);
      }
    });
    
    // Configure transcription settings when settings are available
    updateRecordingServiceSettings();
  };

  const updateRecordingServiceSettings = () => {
    if (stateRef.current.settings) {
      recordingService.setTranscriptionSettings(
        stateRef.current.settings.openaiApiKey,
        stateRef.current.settings.language,
        stateRef.current.settings.saveAudioFiles
      );
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      
      // Initialize UI language from settings
      if (settings.uiLanguage) {
        dispatch({ type: 'SET_LANGUAGE', payload: settings.uiLanguage });
        setI18nLanguage(settings.uiLanguage);
        
        // Notify main process of initial language
        try {
          window.electronAPI?.notifyLanguageChange?.(settings.uiLanguage);
        } catch (error) {
          console.warn('Failed to notify main process of initial language:', error);
        }
      }
      
      // Update recording service settings after loading
      setTimeout(() => updateRecordingServiceSettings(), 100);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' });
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await window.electronAPI.updateSettings(newSettings);
      if (state.settings) {
        dispatch({ 
          type: 'SET_SETTINGS', 
          payload: { ...state.settings, ...newSettings } 
        });
        // Update recording service settings after updating
        setTimeout(() => updateRecordingServiceSettings(), 100);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update settings' });
    }
  };

  const startRecording = async () => {
    if (state.isRecording) {
      return;
    }

    if (!state.selectedAgent) {
      dispatch({ type: 'SET_ERROR', payload: 'Please select an agent before recording' });
      return;
    }

    if (!state.settings) {
      dispatch({ type: 'SET_ERROR', payload: 'Settings not loaded' });
      return;
    }

    // Validate selected agent
    const validation = validateAgentSelection(state.selectedAgent, state.settings.agents);
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error || 'Agent validation failed' });
      return;
    }

    try {
      await recordingService.startRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Recording failed: ${errorMessage}` });
    }
  };

  const stopRecording = async () => {
    if (!state.isRecording) {
      return;
    }

    try {
      await recordingService.stopRecording();
      
      // Don't show result window here - it will be shown when processing completes
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Stop recording failed: ${errorMessage}` });
    }
  };

  const processTranscriptionResult = async (sttResult: STTResult, audioFilePath?: string) => {
    
    // STT result is already set by setupRecordingService, no need to set again
    
    // 設定チェック
    const currentState = stateRef.current;
    if (!currentState.settings || !currentState.selectedAgent) {
      dispatch({ type: 'SET_ERROR', payload: 'No agent selected or settings not available' });
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }
    
    // Validate selected agent
    const validation = validateAgentSelection(currentState.selectedAgent, currentState.settings.agents);
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error || 'Agent validation failed' });
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }
    const selectedAgentConfig = validation.agent;

    // Check if AI processing is enabled for this agent
    if (!selectedAgentConfig.autoProcessAi) {
      dispatch({ type: 'SET_PENDING_TRANSCRIPTION', payload: sttResult.text });
      
      // Show result window when STT completes for AI-disabled agents
      window.electronAPI.showResultWindow?.();
      
      // Add to history (STT only)
      const duration = recordingService.getRecordingDuration() ?? undefined;
      const historyEntry: CreateHistoryEntry = {
        agentId: currentState.selectedAgent,
        agentName: selectedAgentConfig.name,
        transcription: sttResult.text,
        response: '', // No LLM response
        timestamp: new Date(),
        audioFilePath,
        duration,
        agentAutoProcessAi: selectedAgentConfig.autoProcessAi
      };
      
      try {
        await addHistoryEntry(historyEntry);
      } catch (error) {
        handleErrorSilently(error, 'Failed to add history entry');
      }
      
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }

    // Result window already shown after STT completion
    
    // LLM処理開始
    dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_LLM });
    
    try {

      // Get agent configuration
      const agent = currentState.settings.agents.find(a => a.id === currentState.selectedAgent);
      if (!agent) {
        throw new Error('Selected agent not found');
      }

      // Process with LLM
      const llmResult = await window.electronAPI.processWithLLM({
        text: sttResult.text,
        agentId: currentState.selectedAgent
      });

      if (llmResult.success) {
        // 型ガード
        const resultObj = llmResult.result;
        if (
          typeof resultObj === 'object' && resultObj !== null &&
          'text' in resultObj && typeof (resultObj as unknown as { text: unknown }).text === 'string' &&
          'model' in resultObj && typeof (resultObj as unknown as { model: unknown }).model === 'string' &&
          'tokensUsed' in resultObj && typeof (resultObj as unknown as { tokensUsed: unknown }).tokensUsed === 'number'
        ) {
          const llmTyped: LLMResult = resultObj as LLMResult;
          const result: ProcessingResult = {
            agentId: currentState.selectedAgent,
            sttResult,
            llmResult: llmTyped,
            timestamp: new Date()
          };
          
          // Notify main process about LLM result
          window.electronAPI.notifyLlmResult?.(result);
          dispatch({ type: 'SET_STATE', payload: AppState.COMPLETED });

          // Always show result window
          await window.electronAPI.showResultWindow?.();

          // Auto-copy to clipboard
          await copyToClipboard(llmTyped.text);

          // Add to history
          const duration = recordingService.getRecordingDuration() ?? undefined;
          const agent = currentState.settings.agents.find(a => a.id === currentState.selectedAgent);
          const historyEntry: CreateHistoryEntry = {
            agentId: currentState.selectedAgent,
            agentName: agent?.name || 'Unknown Agent',
            transcription: sttResult.text,
            response: llmTyped.text,
            timestamp: new Date(),
            audioFilePath,
            duration,
            agentAutoProcessAi: agent?.autoProcessAi ?? false
          };
          
          try {
            await addHistoryEntry(historyEntry);
          } catch (error) {
            handleErrorSilently(error, 'Failed to add history entry');
          }
        } else {
          throw new Error('LLM result 型不正');
        }

        // 処理完了後、明示的にIDLEに遷移
        setTimeout(() => {
          const currentState = stateRef.current.currentState;
          if (currentState === AppState.COMPLETED) {
            dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
          } else {
            console.log('State is not COMPLETED, skipping transition to IDLE');
          }
        }, 3000);

      } else {
        throw new Error(llmResult.error || 'LLM processing failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
      
      // エラー後、明示的にIDLEに遷移
      setTimeout(() => {
        const currentState = stateRef.current.currentState;
        if (currentState === AppState.ERROR) {
          dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
          dispatch({ type: 'SET_ERROR', payload: null });
        } else {
          console.log('State is not ERROR, skipping transition to IDLE');
        }
      }, 3000);
    }
  };

  const selectAgent = (agentId: string) => {
    dispatch({ type: 'SELECT_AGENT', payload: agentId });
    
    // メインプロセスに選択状態を同期
    try {
      window.electronAPI.setSelectedAgent?.(agentId);
    } catch (error) {
      handleErrorSilently(error, 'Failed to set selected agent');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await window.electronAPI.copyToClipboard(text);
    } catch (error) {
      handleErrorSilently(error, 'Failed to copy to clipboard');
    }
  };

  const testApiConnection = async (): Promise<boolean> => {
    try {
      const result = await window.electronAPI.testApiConnection();
      return result.success && result.connected || false;
    } catch (error) {
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const loadHistory = async () => {
    try {
      const history = await window.electronAPI.getHistory();
      dispatch({ type: 'SET_HISTORY', payload: history });
    } catch (error) {
      handleErrorSilently(error, 'Failed to load history');
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    try {
      const success = await window.electronAPI.deleteHistoryEntry(id);
      if (success) {
        const updatedHistory = await window.electronAPI.getHistory();
        dispatch({ type: 'SET_HISTORY', payload: updatedHistory });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete history entry: ${errorMessage}` });
    }
  };

  const clearHistory = async () => {
    try {
      await window.electronAPI.clearHistory();
      dispatch({ type: 'SET_HISTORY', payload: [] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to clear history: ${errorMessage}` });
    }
  };

  const playAudioFile = async (filePath: string) => {
    try {
      // Use Electron's shell to open the audio file with default audio player
      await window.electronAPI.openExternal(filePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to play audio file: ${errorMessage}` });
    }
  };

  const processWithAi = async (transcription: string) => {
    if (!state.selectedAgent || !state.settings) {
      dispatch({ type: 'SET_ERROR', payload: 'No agent selected or settings not available' });
      return;
    }

    try {
      dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_LLM });

      // Validate selected agent
      const validation = validateAgentSelection(state.selectedAgent, state.settings.agents);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Agent validation failed');
      }
      const agent = validation.agent;
      if (!agent) {
        throw new Error('Agent validation failed');
      }

      const llmResult = await window.electronAPI.processWithLLM({
        text: transcription,
        agentId: state.selectedAgent
      });

      if (llmResult.success) {
        const resultObj = llmResult.result;
        if (isLLMResult(resultObj)) {
          const result: ProcessingResult = {
            agentId: state.selectedAgent,
            sttResult: { text: transcription, language: 'ja', confidence: 0.95 },
            llmResult: resultObj as LLMResult,
            timestamp: new Date()
          };
          dispatch({ type: 'SET_STATE', payload: AppState.COMPLETED });
          dispatch({ type: 'SET_PENDING_TRANSCRIPTION', payload: null });
          
          // Always show result window
          await window.electronAPI.showResultWindow?.();

          await copyToClipboard((resultObj as LLMResult).text);

          // Add to history
          const agent = state.settings.agents.find(a => a.id === state.selectedAgent);
          const historyEntry: CreateHistoryEntry = {
            agentId: state.selectedAgent,
            agentName: agent?.name || 'Unknown Agent',
            transcription: transcription,
            response: (resultObj as LLMResult).text,
            timestamp: new Date(),
            agentAutoProcessAi: agent?.autoProcessAi ?? false
          };
          
          try {
            await addHistoryEntry(historyEntry);
          } catch (error) {
            handleErrorSilently(error, 'Failed to add history entry');
          }

          setTimeout(() => {
            dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
          }, 3000);
        }
      } else {
        throw new Error(llmResult.error || 'LLM processing failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
      
      // Error auto-clear is handled in setupRecordingService
    }
  };

  const skipAiProcessing = () => {
    dispatch({ type: 'SET_PENDING_TRANSCRIPTION', payload: null });
    dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
  };

  const addHistoryEntry = async (entry: CreateHistoryEntry) => {
    try {
      const historyId = await window.electronAPI.addHistoryEntry(entry);
      const newHistoryEntry: HistoryEntry = { id: historyId, ...entry };
      dispatch({ type: 'ADD_HISTORY_ENTRY', payload: newHistoryEntry });
      return historyId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add history entry: ${errorMessage}`);
    }
  };

  const setupElectronListeners = () => {
    // State changes
    window.electronAPI.onStateChanged?.((newState: AppState) => {
      dispatch({ type: 'SET_STATE', payload: newState });
    });

    // STT results - handled through history now
    window.electronAPI.onSttResult?.((result: STTResult) => {
      // STT results are now handled through history
    });

    // LLM results - handled through history now  
    window.electronAPI.onLlmResult?.((result: ProcessingResult) => {
      // LLM results are now handled through history
    });

    // Processing complete - handled through history now
    window.electronAPI.onProcessingComplete?.((result: ProcessingResult) => {
      // Processing results are now handled through history
    });

    // Errors
    window.electronAPI.onError?.((error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    });


    // Agent selection from main process (bar window context menu)
    window.electronAPI.onSelectAgent?.((agentId: string) => {
      dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: agentId });
    });

    // App state updates from main process
    window.electronAPI.onAppStateUpdated?.((appState) => {
      dispatch({ type: 'SET_STATE_FROM_MAIN', payload: appState.currentState });
      dispatch({ type: 'SET_RECORDING_FROM_MAIN', payload: appState.isRecording });
      if (appState.selectedAgent !== null) {
        dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: appState.selectedAgent });
      }
    });

    // History updates from main process
    window.electronAPI.onHistoryUpdated?.((history) => {
      dispatch({ type: 'SET_HISTORY', payload: history });
    });

    // Selected agent changes from main process
    window.electronAPI.onSelectedAgentChanged?.((agentId) => {
      if (agentId) {
        dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: agentId });
      }
    });

    // Recording state changes from main process
    window.electronAPI.onRecordingStateChanged?.((isRecording) => {
      dispatch({ type: 'SET_RECORDING_FROM_MAIN', payload: isRecording });
    });
  };

  const changeLanguage = async (lang: UILanguage) => {
    setI18nLanguage(lang);
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    
    // Notify main process of language change
    try {
      window.electronAPI?.notifyLanguageChange?.(lang);
    } catch (error) {
      console.warn('Failed to notify main process of language change:', error);
    }
    
    // Save to settings
    if (state.settings) {
      try {
        await updateSettings({ uiLanguage: lang });
      } catch (error) {
        console.warn('Failed to save language preference:', error);
      }
    }
  };

  const toggleLanguage = async () => {
    const newLang: UILanguage = state.language === 'en' ? 'ja' : 'en';
    await changeLanguage(newLang);
  };

  const setupOnlineStatusMonitoring = () => {
    // Check initial online status
    checkOnlineStatus();
    
    // Set up periodic monitoring every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000);
    
    // Browser online/offline events (for web-based scenarios)
    if (typeof window !== 'undefined') {
      const handleOnline = () => checkOnlineStatus();
      const handleOffline = () => dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Cleanup
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    return () => clearInterval(interval);
  };

  // Get current results from history
  const getCurrentSTTResult = (): STTResult | null => {
    if (state.history.length === 0) return null;
    const latestEntry = state.history[0];
    return historyEntryToSTTResult(latestEntry);
  };

  const getCurrentLLMResult = (): ProcessingResult | null => {
    if (state.history.length === 0) return null;
    const latestEntry = state.history[0];
    return historyEntryToProcessingResult(latestEntry);
  };

  // Get current result metadata from history
  const getCurrentResultMetadata = () => {
    if (state.history.length === 0) return null;
    const latestEntry = state.history[0];
    return {
      agentId: latestEntry.agentId,
      agentName: latestEntry.agentName,
      timestamp: latestEntry.timestamp,
      audioFilePath: latestEntry.audioFilePath,
      duration: latestEntry.duration,
      agentAutoProcessAi: latestEntry.agentAutoProcessAi
    };
  };

  // Computed properties for backward compatibility
  const sttResult = getCurrentSTTResult();
  const llmResult = getCurrentLLMResult();

  const checkOnlineStatus = async () => {
    try {
      // First check basic network connectivity
      const networkOnline = navigator.onLine;
      if (!networkOnline) {
        dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
        return;
      }

      // Check if OpenAI API is accessible
      if (state.settings?.openaiApiKey) {
        try {
          const apiResult = await testApiConnection();
          dispatch({ type: 'SET_ONLINE_STATUS', payload: apiResult });
        } catch (error) {
          dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
        }
      } else {
        // No API key configured, just check network
        dispatch({ type: 'SET_ONLINE_STATUS', payload: networkOnline });
      }
    } catch (error) {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    }
  };

  const contextValue: AppContextValue = {
    ...state,
    dispatch,
    loadSettings,
    updateSettings,
    startRecording,
    stopRecording,
    selectAgent,
    copyToClipboard,
    testApiConnection,
    clearError,
    deleteHistoryEntry,
    clearHistory,
    playAudioFile,
    processWithAi,
    skipAiProcessing,
    changeLanguage,
    toggleLanguage,
    getCurrentSTTResult,
    getCurrentLLMResult,
    getCurrentResultMetadata,
    sttResult,
    llmResult,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}