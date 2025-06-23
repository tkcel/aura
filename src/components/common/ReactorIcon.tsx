import React from 'react';

import CompletedReactor from '../../assets/reactors/completed.svg';
import ErrorReactor from '../../assets/reactors/error.svg';
import IdleReactor from '../../assets/reactors/idle.svg';
import ProcessingLlmReactor from '../../assets/reactors/processing_llm.svg';
import ProcessingSttReactor from '../../assets/reactors/processing_stt.svg';
import RecordingReactor from '../../assets/reactors/recording.svg';
import { AppState } from '../../types';

interface ReactorIconProps {
  state: AppState;
  size?: 'sm' | 'md' | 'lg';
  spinning?: boolean;
  className?: string;
}

/**
 * Reactor icon component that displays different icons based on app state
 */
export function ReactorIcon({ state, size = 'md', spinning, className = '' }: ReactorIconProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const shouldSpin = spinning ?? (state === AppState.PROCESSING_STT || state === AppState.PROCESSING_LLM);
  
  const baseClasses = `${sizeClasses[size]} opacity-80 ${shouldSpin ? 'animate-spin' : ''} ${className}`;

  const getReactorSrc = () => {
    switch (state) {
      case AppState.IDLE:
        return IdleReactor;
      case AppState.RECORDING:
        return RecordingReactor;
      case AppState.PROCESSING_STT:
        return ProcessingSttReactor;
      case AppState.PROCESSING_LLM:
        return ProcessingLlmReactor;
      case AppState.COMPLETED:
        return CompletedReactor;
      case AppState.ERROR:
        return ErrorReactor;
      default:
        return IdleReactor;
    }
  };

  const getAltText = () => {
    switch (state) {
      case AppState.IDLE:
        return 'Idle';
      case AppState.RECORDING:
        return 'Recording';
      case AppState.PROCESSING_STT:
        return 'Processing Speech';
      case AppState.PROCESSING_LLM:
        return 'Processing AI';
      case AppState.COMPLETED:
        return 'Completed';
      case AppState.ERROR:
        return 'Error';
      default:
        return 'Unknown State';
    }
  };

  return (
    <img 
      src={getReactorSrc()} 
      alt={getAltText()} 
      className={baseClasses}
    />
  );
}