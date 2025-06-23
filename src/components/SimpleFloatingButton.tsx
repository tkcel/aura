import React from 'react';

// Import reactor SVG icons for all AppStates
import CompletedReactor from '../assets/reactors/completed.svg';
import ErrorReactor from '../assets/reactors/error.svg';
import IdleReactor from '../assets/reactors/idle.svg';
import ProcessingLlmReactor from '../assets/reactors/processing_llm.svg';
import ProcessingSttReactor from '../assets/reactors/processing_stt.svg';
import RecordingReactor from '../assets/reactors/recording.svg';
import { useFloatingButton } from '../hooks/useFloatingButton';
import { AppState } from '../types';

export default function SimpleFloatingButton() {
  const {
    currentState,
    isRecording,
    selectedAgentColor,
    handleMainButtonClick,
    handleContextMenu,
    getSpinClasses
  } = useFloatingButton();

  const getMainButtonIcon = () => {
    const spinClasses = getSpinClasses(currentState);
      
    switch (currentState) {
      case AppState.IDLE:
        return <img src={IdleReactor} alt="Idle" className={spinClasses} />;
      case AppState.RECORDING:
        return <img src={RecordingReactor} alt="Recording" className={spinClasses} />;
      case AppState.PROCESSING_STT:
        return <img src={ProcessingSttReactor} alt="Processing STT" className={spinClasses} />;
      case AppState.PROCESSING_LLM:
        return <img src={ProcessingLlmReactor} alt="Processing LLM" className={spinClasses} />;
      case AppState.COMPLETED:
        return <img src={CompletedReactor} alt="Completed" className={spinClasses} />;
      case AppState.ERROR:
        return <img src={ErrorReactor} alt="Error" className={spinClasses} />;
      default:
        return <img src={IdleReactor} alt="Default" className={spinClasses} />;
    }
  };

  return (
    <div className="floating-button-container w-[60px] h-[60px] flex items-center justify-center relative">
      
      {/* Main floating button with HUD design */}
      <button
        className="relative group transition-all duration-200 flex items-center justify-center w-full h-full"
        onClick={handleMainButtonClick}
        onContextMenu={handleContextMenu}
        title={isRecording ? "Stop recording (click) / Open menu (right-click)" : "Start recording (click) / Open menu (right-click)"}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        aria-pressed={isRecording}
        role="button"
        tabIndex={0}
      >
        {/* Container to ensure perfect centering */}
        <div className="relative flex items-center justify-center">
          {/* Reactor icon container */}
          <div className="w-12 h-12 border-2 border-white/40 bg-white/10 flex items-center justify-center p-2 group-hover:border-white/60 group-hover:bg-white/20 transition-all duration-200">
            {getMainButtonIcon()}
          </div>
          
          {/* Corner brackets */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white/60 group-hover:border-white/80 transition-colors duration-200"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white/60 group-hover:border-white/80 transition-colors duration-200"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white/60 group-hover:border-white/80 transition-colors duration-200"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white/60 group-hover:border-white/80 transition-colors duration-200"></div>
          
          {/* Agent color indicator */}
          {selectedAgentColor && (
            <div 
              className="absolute top-0 right-0 w-2 h-2 rounded-full border border-white/80 shadow-sm z-10"
              style={{ backgroundColor: selectedAgentColor }}
            />
          )}
        </div>
      </button>
    </div>
  );
}