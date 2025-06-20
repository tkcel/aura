import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from '../context/AppContext';
import Header from './Header';
import AgentSection from './AgentSection';
import RecordingControls from './RecordingControls';
import ResultsSection from './ResultsSection';
import HistorySection from './HistorySection';
import SettingsModal from './SettingsModal';
import ProcessingOverlay from './ProcessingOverlay';
import BarWindow from './BarWindow';
import { AppState } from '../types';

function AppContent() {
  const { currentState, error, clearError, history, deleteHistoryEntry, clearHistory, playAudioFile, copyToClipboard } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [windowMode, setWindowMode] = useState<'bar' | 'settings'>('settings');

  // Detect window mode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'bar') {
      setWindowMode('bar');
    } else {
      setWindowMode('settings');
    }
  }, []);

  const showProcessingOverlay = 
    currentState === AppState.PROCESSING_STT || 
    currentState === AppState.PROCESSING_LLM;

  // Render bar window for desktop bar mode
  if (windowMode === 'bar') {
    return (
      <div className="h-full flex items-center justify-center p-2">
        <BarWindow />
        {error && (
          <div className="fixed bottom-16 right-4 bg-red-500 text-white px-3 py-1 rounded text-xs shadow-lg max-w-xs">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={clearError}
                className="ml-2 text-white hover:text-gray-200 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render full settings window
  return (
    <div className="h-screen flex flex-col">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />
      
      <main className="flex-1 p-8 overflow-y-auto bg-white/10">
        <AgentSection />
        <RecordingControls />
        <ResultsSection />
        <HistorySection 
          history={history}
          onDeleteEntry={deleteHistoryEntry}
          onClearHistory={clearHistory}
          onPlayAudio={playAudioFile}
          onCopyText={copyToClipboard}
        />
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {showProcessingOverlay && <ProcessingOverlay />}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
          <div className="flex justify-between items-start">
            <span className="text-sm">{error}</span>
            <button 
              onClick={clearError}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}