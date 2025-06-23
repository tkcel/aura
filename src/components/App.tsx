import React, { useState, useEffect } from 'react';

import { AppProvider, useApp } from '../context/AppContext';
import { AppState } from '../types';

import BarWindow from './BarWindow';
import Header from './Header';
import HistoryScreen from './HistoryScreen';
import ModeEditScreen from './ModeEditScreen';
import ProcessingOverlay from './ProcessingOverlay';
import ResultWindow from './ResultWindow';
import SettingsScreen from './SettingsScreen';
import TabNavigation from './TabNavigation';

function AppContent() {
  const { currentState, error, clearError } = useApp();
  const [activeTab, setActiveTab] = useState('mode-edit');
  const [windowMode, setWindowMode] = useState<'bar' | 'settings' | 'result'>('settings');

  // Detect window mode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'bar') {
      setWindowMode('bar');
    } else if (mode === 'result') {
      setWindowMode('result');
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
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            background: transparent !important;
          }
        `}} />
        <div className="h-full w-full">
          <BarWindow />
          {error && (
            <div className="fixed bottom-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-xs shadow-lg max-w-xs" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
      </>
    );
  }

  // Render result window
  if (windowMode === 'result') {
    return <ResultWindow />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mode-edit':
        return <ModeEditScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <ModeEditScreen />;
    }
  };

  // Render full settings window
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto bg-white/10">
        {renderTabContent()}
      </main>

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