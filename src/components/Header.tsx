import React from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';

export default function Header() {
  const { currentState } = useApp();

  const getStatusText = () => {
    switch (currentState) {
      case AppState.IDLE:
        return '待機中';
      case AppState.RECORDING:
        return '録音中';
      case AppState.PROCESSING_STT:
        return '音声認識中';
      case AppState.PROCESSING_LLM:
        return 'AI処理中';
      case AppState.COMPLETED:
        return '完了';
      case AppState.ERROR:
        return 'エラー';
      default:
        return '待機中';
    }
  };

  const getStatusDotClass = () => {
    switch (currentState) {
      case AppState.IDLE:
      case AppState.COMPLETED:
        return 'idle';
      case AppState.RECORDING:
        return 'recording';
      case AppState.PROCESSING_STT:
      case AppState.PROCESSING_LLM:
        return 'processing';
      case AppState.ERROR:
        return 'error';
      default:
        return 'idle';
    }
  };

  return (
    <header className="glass-strong p-6 border-b border-white/20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
          🎯 Aura
        </h1>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {getStatusText()}
          </span>
          <div className={`status-dot ${getStatusDotClass()}`} />
        </div>
      </div>
    </header>
  );
}