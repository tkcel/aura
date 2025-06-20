import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppSettings, ProcessingResult, STTResult, AppState, HistoryEntry } from '../types';
import { RecordingService, RecordingState } from '../services/recording';

interface AppContextState {
  settings: AppSettings | null;
  currentState: AppState;
  selectedAgent: string | null;
  isRecording: boolean;
  sttResult: STTResult | null;
  llmResult: ProcessingResult | null;
  error: string | null;
  history: HistoryEntry[];
}

type AppAction =
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'SELECT_AGENT'; payload: string }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_STT_RESULT'; payload: STTResult }
  | { type: 'SET_LLM_RESULT'; payload: ProcessingResult }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'SET_HISTORY'; payload: HistoryEntry[] }
  | { type: 'ADD_HISTORY_ENTRY'; payload: HistoryEntry };

const initialState: AppContextState = {
  settings: null,
  currentState: AppState.IDLE,
  selectedAgent: null,
  isRecording: false,
  sttResult: null,
  llmResult: null,
  error: null,
  history: [],
};

function appReducer(state: AppContextState, action: AppAction): AppContextState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_STATE':
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
    default:
      return state;
  }
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

  // Initialize app and load settings
  useEffect(() => {
    loadSettings();
    loadHistory();
    setupElectronListeners();
    setupRecordingService();
  }, []);

  const setupRecordingService = () => {
    recordingService.setEventHandlers({
      onStateChange: (recordingState: RecordingState) => {
        console.log('🎤 Recording state changed:', recordingState);
        
        switch (recordingState) {
          case RecordingState.RECORDING:
            dispatch({ type: 'SET_RECORDING', payload: true });
            dispatch({ type: 'SET_STATE', payload: AppState.RECORDING });
            dispatch({ type: 'CLEAR_RESULTS' });
            break;
          case RecordingState.PROCESSING:
            dispatch({ type: 'SET_RECORDING', payload: false });
            dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_STT });
            break;
          case RecordingState.IDLE:
            dispatch({ type: 'SET_RECORDING', payload: false });
            if (state.currentState === AppState.PROCESSING_STT) {
              // Only set to IDLE if we were processing
              dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
            }
            break;
          case RecordingState.ERROR:
            dispatch({ type: 'SET_RECORDING', payload: false });
            dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
            break;
        }
      },
      onError: (error: Error) => {
        console.error('Recording service error:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
        dispatch({ type: 'SET_RECORDING', payload: false });
      },
      onTranscriptionComplete: (result: STTResult) => {
        console.log('✅ Transcription complete:', result);
        dispatch({ type: 'SET_STT_RESULT', payload: result });
        processTranscriptionResult(result);
      }
    });
  };

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });
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
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update settings' });
    }
  };

  const startRecording = async () => {
    if (state.isRecording || !state.selectedAgent) {
      console.log('Cannot start recording:', { isRecording: state.isRecording, selectedAgent: state.selectedAgent });
      return;
    }

    try {
      console.log('Starting recording...');
      await recordingService.startRecording();
    } catch (error) {
      console.error('Start recording failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Recording failed: ${errorMessage}` });
    }
  };

  const stopRecording = async () => {
    if (!state.isRecording) {
      console.log('Cannot stop recording: not recording');
      return;
    }

    try {
      console.log('Stopping recording...');
      await recordingService.stopRecording();
      
      // Start transcription process
      setTimeout(async () => {
        await processRecordingTranscription();
      }, 100);
    } catch (error) {
      console.error('Stop recording failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: `Stop recording failed: ${errorMessage}` });
    }
  };

  const processRecordingTranscription = async () => {
    if (!state.selectedAgent || !state.settings) return;

    try {
      console.log('🤖 Starting transcription process...');
      dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_STT });
      
      // Use the recording service to transcribe the latest recording
      const transcriptionResult = await recordingService.transcribeLatestRecording(
        state.settings.openaiApiKey,
        state.settings.language,
        state.settings.saveAudioFiles
      );
      
      const sttResult = transcriptionResult.result;
      
      dispatch({ type: 'SET_STT_RESULT', payload: sttResult });
      await processTranscriptionResult(sttResult, transcriptionResult.audioFilePath);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
      
      // Return to IDLE state after error
      setTimeout(() => {
        dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
        dispatch({ type: 'SET_ERROR', payload: null });
      }, 5000);
    }
  };

  const processTranscriptionResult = async (sttResult: STTResult, audioFilePath?: string) => {
    if (!state.selectedAgent || !state.settings) return;

    try {
      dispatch({ type: 'SET_STATE', payload: AppState.PROCESSING_LLM });

      // Get agent configuration
      const agent = state.settings.agents.find(a => a.id === state.selectedAgent);
      if (!agent) {
        throw new Error('Selected agent not found');
      }

      // Process with LLM
      const llmResult = await window.electronAPI.processWithLLM({
        text: sttResult.text,
        agentId: state.selectedAgent
      });

      if (llmResult.success) {
        const result: ProcessingResult = {
          agentId: state.selectedAgent,
          sttResult,
          llmResult: llmResult.result,
          timestamp: new Date()
        };

        dispatch({ type: 'SET_LLM_RESULT', payload: result });
        dispatch({ type: 'SET_STATE', payload: AppState.COMPLETED });

        // Auto-copy to clipboard
        await copyToClipboard(llmResult.result.text);

        // Add to history
        const duration = recordingService.getRecordingDuration();
        const agent = state.settings.agents.find(a => a.id === state.selectedAgent);
        
        const historyEntry: Omit<HistoryEntry, 'id'> = {
          agentId: state.selectedAgent,
          agentName: agent?.name || 'Unknown Agent',
          transcription: sttResult.text,
          response: llmResult.result.text,
          timestamp: new Date(),
          audioFilePath,
          duration
        };
        
        const historyId = await window.electronAPI.addHistoryEntry(historyEntry);
        const newHistoryEntry: HistoryEntry = { id: historyId, ...historyEntry };
        dispatch({ type: 'ADD_HISTORY_ENTRY', payload: newHistoryEntry });
        
        // Note: Cleanup is now handled by the main process based on settings

        // After a brief moment, return to IDLE state
        setTimeout(() => {
          dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
        }, 3000); // Show results for 3 seconds

      } else {
        throw new Error(llmResult.error || 'LLM processing failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATE', payload: AppState.ERROR });
      
      // Return to IDLE state after error
      setTimeout(() => {
        dispatch({ type: 'SET_STATE', payload: AppState.IDLE });
        dispatch({ type: 'SET_ERROR', payload: null });
      }, 5000); // Show error for 5 seconds
    }
  };

  const selectAgent = (agentId: string) => {
    console.log('selectAgent called with:', agentId);
    dispatch({ type: 'SELECT_AGENT', payload: agentId });
    dispatch({ type: 'CLEAR_RESULTS' });
    // Note: Recording is now manually controlled by user
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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}