import React from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';
import { t } from '../utils/i18n';

export default function ProcessingOverlay() {
  const { currentState } = useApp();

  const getProcessingData = () => {
    switch (currentState) {
      case AppState.PROCESSING_STT:
        return {
          icon: "◐",
          text: t('processing.analyzingVoice'),
          status: t('results.voiceTab')
        };
      case AppState.PROCESSING_LLM:
        return {
          icon: "◑",
          text: t('processing.neuralProcessing'),
          status: t('results.aiTab')
        };
      default:
        return {
          icon: "◦",
          text: t('common.processing') + '...',
          status: t('common.processing')
        };
    }
  };

  const processingData = getProcessingData();

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 hud-scanlines">
      <div className="hud-panel hud-border-corner p-8 text-center">
        <div className="text-6xl hud-animate-spin mb-6 text-white/80">
          {processingData.icon}
        </div>
        <div className="hud-subtitle mb-2">
          {processingData.status}
        </div>
        <p className="hud-text text-white/70">
          {processingData.text}
        </p>
        
        {/* Additional visual elements */}
        <div className="mt-6 flex justify-center space-x-4">
          <div className="w-2 h-2 hud-status-dot processing"></div>
          <div className="w-2 h-2 hud-status-dot processing" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 hud-status-dot processing" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}