import { useCallback, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';
import { autoSelectFirstAgent } from '../utils/agent-helpers';

/**
 * Shared logic for floating button components
 */
export function useFloatingButton() {
  const { 
    currentState, 
    isRecording, 
    startRecording, 
    stopRecording, 
    settings, 
    selectAgent, 
    selectedAgent 
  } = useApp();

  // Get selected agent color
  const selectedAgentColor = selectedAgent && settings ? 
    settings.agents.find(a => a.id === selectedAgent)?.color : null;

  // Main button click handler with auto-selection logic
  const handleMainButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) {
      stopRecording();
    } else {
      // Auto-select first available agent if none selected
      if (settings?.agents) {
        autoSelectFirstAgent(selectedAgent, settings.agents, selectAgent);
      }
      startRecording();
    }
  }, [isRecording, selectedAgent, settings, stopRecording, startRecording, selectAgent]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.showBarContextMenu?.();
  }, []);

  // Listen for agent selection from native menu
  useEffect(() => {
    const handleSelectAgent = (agentId: string) => {
      selectAgent(agentId);
    };

    window.electronAPI.onSelectAgent?.(handleSelectAgent);

    return () => {
      window.electronAPI.removeAllListeners?.('select-agent');
    };
  }, [selectAgent]);

  // Get spin classes for processing states
  const getSpinClasses = useCallback((currentState: AppState) => {
    return (currentState === AppState.PROCESSING_STT || currentState === AppState.PROCESSING_LLM) 
      ? "w-full h-full opacity-80 animate-spin" 
      : "w-full h-full opacity-80";
  }, []);

  return {
    currentState,
    isRecording,
    startRecording,
    stopRecording,
    settings,
    selectAgent,
    selectedAgent,
    selectedAgentColor,
    handleMainButtonClick,
    handleContextMenu,
    getSpinClasses
  };
}