import React from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';

export default function ProcessingOverlay() {
  const { currentState } = useApp();

  const getProcessingText = () => {
    switch (currentState) {
      case AppState.PROCESSING_STT:
        return '音声を認識しています...';
      case AppState.PROCESSING_LLM:
        return 'AIが処理しています...';
      default:
        return '処理中...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium">
          {getProcessingText()}
        </p>
      </div>
    </div>
  );
}