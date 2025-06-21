import React, { useEffect } from 'react';


// Import reactor SVG icons for all AppStates
import IdleReactor from '../assets/reactors/idle.svg';
import RecordingReactor from '../assets/reactors/recording.svg';
import ProcessingSttReactor from '../assets/reactors/processing_stt.svg';
import ProcessingLlmReactor from '../assets/reactors/processing_llm.svg';
import CompletedReactor from '../assets/reactors/completed.svg';
import ErrorReactor from '../assets/reactors/error.svg';
import { useApp } from '../context/AppContext';
import { AppState } from '../types';

export default function SimpleFloatingButton() {
  const { currentState, isRecording, startRecording, stopRecording, settings, selectAgent, selectedAgent } = useApp();

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

  const handleMainButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRecording) {
      stopRecording();
    } else {
      // Select first available agent if none selected
      if (!selectedAgent && settings && Array.isArray(settings.agents) && settings.agents.length > 0) {
        const firstEnabledAgent = settings.agents.find(agent => agent.enabled);
        if (firstEnabledAgent) {
          selectAgent(firstEnabledAgent.id);
        }
      }
      startRecording();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.showBarContextMenu?.();
  };

  const getMainButtonIcon = () => {
    switch (currentState) {
      case AppState.IDLE:
        return <img src={IdleReactor} alt="Idle" className="w-12 h-12" />;
      case AppState.RECORDING:
        return <img src={RecordingReactor} alt="Recording" className="w-12 h-12" />;
      case AppState.PROCESSING_STT:
        return <img src={ProcessingSttReactor} alt="Processing STT" className="w-12 h-12 animate-spin" />;
      case AppState.PROCESSING_LLM:
        return <img src={ProcessingLlmReactor} alt="Processing LLM" className="w-12 h-12 animate-spin" />;
      case AppState.COMPLETED:
        return <img src={CompletedReactor} alt="Completed" className="w-12 h-12" />;
      case AppState.ERROR:
        return <img src={ErrorReactor} alt="Error" className="w-12 h-12" />;
      default:
        return <img src={IdleReactor} alt="Default" className="w-12 h-12" />;
    }
  };

  return (
    <div className="floating-button-container h-full w-full flex items-center justify-center">
      {/* Main floating button */}
      <button
        className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all duration-200`}
        onClick={handleMainButtonClick}
        onContextMenu={handleContextMenu}
        title={isRecording ? "録音を停止 (クリック) / メニューを開く (右クリック)" : "録音を開始 (クリック) / メニューを開く (右クリック)"}
        aria-label={isRecording ? "録音を停止" : "録音を開始"}
        aria-pressed={isRecording}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-center">
          {getMainButtonIcon()}
        </div>
      </button>
    </div>
  );
}