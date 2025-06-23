import React, { createContext, useContext, useReducer, useEffect, ReactNode, useRef } from 'react';

import { RecordingService, RecordingState } from '../services/recording';
import { AppSettings, ProcessingResult, STTResult, AppState, HistoryEntry, LLMResult } from '../types';

interface AppContextState {
  settings: AppSettings | null;
  currentState: AppState;
  selectedAgent: string | null;
  isRecording: boolean;
  sttResult: STTResult | null;
  llmResult: ProcessingResult | null;
  error: string | null;
  history: HistoryEntry[];
  pendingTranscription: string | null;
}

type AppAction =
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_STATE'; payload: AppState; syncWithMain?: boolean }
  | { type: 'SELECT_AGENT'; payload: string; syncWithMain?: boolean }
  | { type: 'SET_RECORDING'; payload: boolean; syncWithMain?: boolean }
  | { type: 'SET_STT_RESULT'; payload: STTResult }
  | { type: 'SET_LLM_RESULT'; payload: ProcessingResult }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SET_HISTORY'; payload: HistoryEntry[] }
  | { type: 'ADD_HISTORY_ENTRY'; payload: HistoryEntry }
  | { type: 'SET_PENDING_TRANSCRIPTION'; payload: string | null }
  | { type: 'SET_STATE_FROM_MAIN'; payload: AppState }
  | { type: 'SELECT_AGENT_FROM_MAIN'; payload: string }
  | { type: 'SET_RECORDING_FROM_MAIN'; payload: boolean };

const initialState: AppContextState = {
  settings: null,
  currentState: AppState.IDLE,
  selectedAgent: null,
  isRecording: false,
  sttResult: null,
  llmResult: null,
  error: null,
  history: [],
  pendingTranscription: null,
};

function appReducer(state: AppContextState, action: AppAction): AppContextState {
  const newState = (() => {
    switch (action.type) {
      case 'SET_SETTINGS':
        return { ...state, settings: action.payload };
      case 'SET_STATE':
        if (state.currentState === action.payload) {
          console.log('🔄 SET_STATE: Skipping duplicate state change:', action.payload);
          return state;
        }
        console.log('🔄 SET_STATE:', state.currentState, '->', action.payload);
        
        // 不正な状態遷移を検出
        if ((state.currentState === AppState.RECORDING || 
             state.currentState === AppState.PROCESSING_STT || 
             state.currentState === AppState.PROCESSING_LLM) && 
            action.payload === AppState.IDLE) {
          console.log('🚨 SUSPICIOUS TRANSITION:', state.currentState, '-> IDLE');
          console.trace('State change stack trace:');
        }
        
        return { ...state, currentState: action.payload };
      case 'SELECT_AGENT':
        return { ...state, selectedAgent: action.payload };
      case 'SET_RECORDING':
        return { ...state, isRecording: action.payload };
      case 'SET_STT_RESULT':
        return { ...state, sttResult: action.payload };
      case 'SET_LLM_RESULT':
        return { ...state, llmResult: action.payload };
      case 'SET_ERROR':
        return { ...state, error: action.payload };
      case 'CLEAR_RESULTS':
        return { ...state, sttResult: null, llmResult: null };
      case 'SET_HISTORY':
        return { ...state, history: action.payload };
      case 'ADD_HISTORY_ENTRY':
        return { ...state, history: [action.payload, ...state.history] };
      case 'SET_PENDING_TRANSCRIPTION':
        return { ...state, pendingTranscription: action.payload };
      // Actions from main process - no sync back to main needed
      case 'SET_STATE_FROM_MAIN':
        console.log('📡 SET_STATE_FROM_MAIN:', state.currentState, '->', action.payload);
        if ((state.currentState === AppState.RECORDING || 
             state.currentState === AppState.PROCESSING_STT || 
             state.currentState === AppState.PROCESSING_LLM) && 
            action.payload === AppState.IDLE) {
          console.log('🚨 SUSPICIOUS MAIN TRANSITION:', state.currentState, '-> IDLE');
        }
        return { ...state, currentState: action.payload };
      case 'SELECT_AGENT_FROM_MAIN':
        return { ...state, selectedAgent: action.payload };
      case 'SET_RECORDING_FROM_MAIN':
        return { ...state, isRecording: action.payload };
      default:
        return state;
    }
  })();

  // TEMPORARILY DISABLE ALL MAIN PROCESS SYNC
  // if ((action.type === 'SET_STATE' || action.type === 'SET_RECORDING' || action.type === 'SELECT_AGENT') && 
  //     action.syncWithMain !== false) {
  //   // Use setTimeout to avoid blocking the state update
  //   setTimeout(() => {
  //     try {
  //       if (action.type === 'SET_STATE') {
  //         console.log('🔄 Syncing state with main process:', action.payload);
  //         // window.electronAPI.setState?.(action.payload);
  //       } else if (action.type === 'SET_RECORDING') {
  //         window.electronAPI.setRecordingState?.(action.payload);
  //       } else if (action.type === 'SELECT_AGENT') {
  //         window.electronAPI.setSelectedAgent?.(action.payload);
  //       }
  //     } catch (error) {
  //       console.warn('Failed to sync state with main process:', error);
  //     }
  //   }, 0);
  // }

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
      console.error('Failed to load initial state:', error);
    }
  };

  const setupRecordingService = () => {
    recordingService.setEventHandlers({
      onStateChange: (recordingState: RecordingState) => {
        console.log('🎤 RecordingState changed to:', recordingState, 'Current AppState:', stateRef.current.currentState);
        
        // RecordingService状態変更はisRecordingフラグのみ更新
        // AppStateは独立して管理
        switch (recordingState) {
          case RecordingState.RECORDING:
            dispatch({ type: 'SET_RECORDING', payload: true });
            if (stateRef.current.currentState === AppState.IDLE) {
              dispatch({ type: 'SET_STATE', payload: AppState.RECORDING });
              dispatch({ type: 'CLEAR_RESULTS' });
            }
            break;
          case RecordingState.PROCESSING:
            dispatch({ type: 'SET_RECORDING', payload: false });
            // RECORDING状態からRECORDING状態以外でもPROCESSING_STTに遷移
            console.log('🎤 RecordingState.PROCESSING - Force transition to PROCESSING_STT');
            dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_STT });
            break;
          case RecordingState.IDLE:
            dispatch({ type: 'SET_RECORDING', payload: false });
            // RecordingService.IDLEはisRecordingフラグのみ更新
            // AppStateはそのまま維持
            console.log('🎤 RecordingState.IDLE - Maintaining current state:', stateRef.current.currentState);
            break;
          case RecordingState.ERROR:
            dispatch({ type: 'SET_RECORDING', payload: false });
            dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
            
            // Auto-clear error after 5 seconds
            setTimeout(() => {
              dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
              dispatch({ type: 'SET_ERROR', payload: null });
            }, 5000);
            break;
        }
      },
      onError: (error: Error) => {
        console.error('Recording service error:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
        dispatch({ type: 'SET_RECORDING', payload: false });
      },
      onTranscriptionComplete: (result: STTResult, audioFilePath?: string) => {
        dispatch({ type: 'SET_STT_RESULT', payload: result });
        // STT完了後は明示的にLLM処理またはIDLEに遷移
        processTranscriptionResult(result, audioFilePath);
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
      // Update recording service settings after loading
      setTimeout(() => updateRecordingServiceSettings(), 100);
    } catch (error) {
      console.error('Failed to load settings:', error);
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
      console.error('Failed to update settings:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update settings' });
    }
  };

  const startRecording = async () => {
    if (state.isRecording || !state.selectedAgent) {
      return;
    }

    try {
      await recordingService.startRecording();
    } catch (error) {
      console.error('Start recording failed:', error);
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
    } catch (error) {
      console.error('Stop recording failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Stop recording failed: ${errorMessage}` });
    }
  };

  const processTranscriptionResult = async (sttResult: STTResult, audioFilePath?: string) => {
    console.log('🎯 processTranscriptionResult called, current state:', stateRef.current.currentState);
    
    // 設定チェック
    const currentState = stateRef.current;
    if (!currentState.settings || !currentState.selectedAgent) {
      console.log('🎯 Missing settings or agent, transitioning to IDLE');
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }
    
    const selectedAgentConfig = currentState.settings.agents.find(a => a.id === currentState.selectedAgent);
    if (!selectedAgentConfig) {
      console.log('🎯 Agent not found, transitioning to IDLE');
      dispatch({ type: 'SET_ERROR', payload: 'Selected agent not found' });
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }

    // Check if AI processing is enabled for this agent
    console.log('🎯 Agent autoProcessAi:', selectedAgentConfig.autoProcessAi);
    if (!selectedAgentConfig.autoProcessAi) {
      console.log('🎯 AI processing disabled, setting pending transcription and transitioning to IDLE');
      dispatch({ type: 'SET_PENDING_TRANSCRIPTION', payload: sttResult.text });
      dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
      return;
    }

    // LLM処理開始
    console.log('🎯 Starting LLM processing...');
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
          console.log('🎯 LLM processing completed successfully');
          dispatch({ type: 'SET_LLM_RESULT', payload: result });
          dispatch({ type: 'SET_STATE', payload: AppState.COMPLETED });

          // Check if we should auto-paste or show result window
          const shouldAutoPaste = await window.electronAPI.checkCursorState?.();
          
          // Always show result window
          await window.electronAPI.showResultWindow?.();

          // Auto-copy to clipboard
          await copyToClipboard(llmTyped.text);

          // Add to history
          const duration = recordingService.getRecordingDuration() ?? undefined;
          const agent = currentState.settings.agents.find(a => a.id === currentState.selectedAgent);
          const historyEntry: Omit<HistoryEntry, 'id'> = {
            agentId: currentState.selectedAgent,
            agentName: agent?.name || 'Unknown Agent',
            transcription: sttResult.text,
            response: llmTyped.text,
            timestamp: new Date(),
            audioFilePath,
            duration
          };
          const historyId = await window.electronAPI.addHistoryEntry(historyEntry);
          const newHistoryEntry: HistoryEntry = { id: historyId, ...historyEntry };
          dispatch({ type: 'ADD_HISTORY_ENTRY', payload: newHistoryEntry });
        } else {
          throw new Error('LLM result 型不正');
        }

        // 処理完了後、明示的にIDLEに遷移
        console.log('🎯 Processing complete, transitioning to IDLE in 3 seconds');
        setTimeout(() => {
          const currentState = stateRef.current.currentState;
          if (currentState === AppState.COMPLETED) {
            console.log('🎯 Transitioning to IDLE after completion');
            dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
          } else {
            console.log('🎯 Skipping IDLE transition, current state:', currentState);
          }
        }, 3000);

      } else {
        throw new Error(llmResult.error || 'LLM processing failed');
      }

    } catch (error) {
      console.log('🎯 LLM processing failed, transitioning to ERROR then IDLE');
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
      
      // エラー後、明示的にIDLEに遷移
      setTimeout(() => {
        const currentState = stateRef.current.currentState;
        if (currentState === AppState.ERROR) {
          console.log('🎯 Error cleared, transitioning to IDLE');
          dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
          dispatch({ type: 'SET_ERROR', payload: null });
        } else {
          console.log('🎯 Skipping error clear, current state:', currentState);
        }
      }, 3000);
    }
  };

  const selectAgent = (agentId: string) => {
    dispatch({ type: 'SELECT_AGENT', payload: agentId });
    dispatch({ type: 'CLEAR_RESULTS' });
    // Main process sync is handled in reducer
  };

  const copyToClipboard = async (text: string) => {
    try {
      await window.electronAPI.copyToClipboard(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const testApiConnection = async (): Promise<boolean> => {
    try {
      const result = await window.electronAPI.testApiConnection();
      return result.success && result.connected || false;
    } catch (error) {
      console.error('API connection test failed:', error);
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
      console.error('Failed to load history:', error);
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
      console.error('Failed to delete history entry:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to delete history entry: ${errorMessage}` });
    }
  };

  const clearHistory = async () => {
    try {
      await window.electronAPI.clearHistory();
      dispatch({ type: 'SET_HISTORY', payload: [] });
    } catch (error) {
      console.error('Failed to clear history:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to clear history: ${errorMessage}` });
    }
  };

  const playAudioFile = async (filePath: string) => {
    try {
      // Use Electron's shell to open the audio file with default audio player
      await window.electronAPI.openExternal(filePath);
    } catch (error) {
      console.error('Failed to play audio file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Failed to play audio file: ${errorMessage}` });
    }
  };

  const processWithAi = async (transcription: string) => {
    if (!state.selectedAgent || !state.settings) return;

    try {
      dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_LLM });

      const agent = state.settings.agents.find(a => a.id === state.selectedAgent);
      if (!agent) {
        throw new Error('Selected agent not found');
      }

      const llmResult = await window.electronAPI.processWithLLM({
        text: transcription,
        agentId: state.selectedAgent
      });

      if (llmResult.success) {
        const resultObj = llmResult.result;
        if (
          typeof resultObj === 'object' && resultObj !== null &&
          'text' in resultObj && typeof (resultObj as { text: unknown }).text === 'string' &&
          'model' in resultObj && typeof (resultObj as { model: unknown }).model === 'string' &&
          'tokensUsed' in resultObj && typeof (resultObj as { tokensUsed: unknown }).tokensUsed === 'number'
        ) {
          const result: ProcessingResult = {
            agentId: state.selectedAgent,
            sttResult: { text: transcription, language: 'ja', confidence: 0.95 },
            llmResult: resultObj as LLMResult,
            timestamp: new Date()
          };
          dispatch({ type: 'SET_LLM_RESULT', payload: result });
          dispatch({ type: 'SET_STATE', payload: AppState.COMPLETED });
          dispatch({ type: 'SET_PENDING_TRANSCRIPTION', payload: null });
          
          // Check if we should auto-paste or show result window
          const shouldAutoPaste = await window.electronAPI.checkCursorState?.();
          
          // Always show result window
          await window.electronAPI.showResultWindow?.();

          await copyToClipboard((resultObj as LLMResult).text);

          // Add to history
          const agent = state.settings.agents.find(a => a.id === state.selectedAgent);
          const historyEntry: Omit<HistoryEntry, 'id'> = {
            agentId: state.selectedAgent,
            agentName: agent?.name || 'Unknown Agent',
            transcription: transcription,
            response: (resultObj as LLMResult).text,
            timestamp: new Date(),
          };
          const historyId = await window.electronAPI.addHistoryEntry(historyEntry);
          const newHistoryEntry: HistoryEntry = { id: historyId, ...historyEntry };
          dispatch({ type: 'ADD_HISTORY_ENTRY', payload: newHistoryEntry });

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

  const setupElectronListeners = () => {
    // State changes
    window.electronAPI.onStateChanged((newState: AppState) => {
      dispatch({ type: 'SET_STATE', payload: newState });
    });

    // STT results
    window.electronAPI.onSttResult((result: STTResult) => {
      dispatch({ type: 'SET_STT_RESULT', payload: result });
    });

    // Processing complete
    window.electronAPI.onProcessingComplete((result: ProcessingResult) => {
      dispatch({ type: 'SET_LLM_RESULT', payload: result });
      // Don't clear results immediately, let user see them
    });

    // Errors
    window.electronAPI.onError((error: string) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    });

    // Agent selection from main process (bar window context menu)
    window.electronAPI.onSelectAgent((agentId: string) => {
      dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: agentId });
    });

    // App state updates from main process - TEMPORARILY DISABLED
    // window.electronAPI.onAppStateUpdated?.((appState) => {
    //   console.log('📡 Received app state update from main:', appState);
    //   dispatch({ type: 'SET_STATE_FROM_MAIN', payload: appState.currentState });
    //   dispatch({ type: 'SET_RECORDING_FROM_MAIN', payload: appState.isRecording });
    //   if (appState.selectedAgent !== null) {
    //     dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: appState.selectedAgent });
    //   }
    // });

    // History updates from main process
    window.electronAPI.onHistoryUpdated?.((history) => {
      dispatch({ type: 'SET_HISTORY', payload: history });
    });

    // TEMPORARILY DISABLE MAIN PROCESS LISTENERS
    // // Selected agent changes from main process
    // window.electronAPI.onSelectedAgentChanged?.((agentId) => {
    //   if (agentId) {
    //     dispatch({ type: 'SELECT_AGENT_FROM_MAIN', payload: agentId });
    //   }
    // });

    // // Recording state changes from main process
    // window.electronAPI.onRecordingStateChanged?.((isRecording) => {
    //   dispatch({ type: 'SET_RECORDING_FROM_MAIN', payload: isRecording });
    // });
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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}