import React from 'react';

import { useApp } from '../context/AppContext';
import { t } from '../utils/i18n';

import AgentSection from './AgentSection';
import RecordingControls from './RecordingControls';
import ResultsSection from './ResultsSection';

export default function RecordingScreen() {
  const { 
    selectedAgent, 
    copyToClipboard,
    pendingTranscription,
    processWithAi,
    skipAiProcessing,
    settings
  } = useApp();

  const handleProcessWithAi = async () => {
    if (!pendingTranscription) return;
    await processWithAi(pendingTranscription);
  };

  const handleCopyTranscription = () => {
    if (pendingTranscription) {
      copyToClipboard(pendingTranscription);
    }
  };

  // Get current agent's autoProcessAi setting
  const currentAgent = selectedAgent && settings ? 
    settings.agents.find(a => a.id === selectedAgent) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{t('recording.voiceRecording')}</h2>
        {currentAgent && (
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">
              {currentAgent.name}: {t('recording.autoAiProcessing')} {currentAgent.autoProcessAi ? t('recording.enabled') : t('recording.disabled')}
            </span>
          </div>
        )}
      </div>

      <AgentSection />
      <RecordingControls />

      {/* Transcription-only results */}
      {pendingTranscription && (
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-100 mb-2">
            {t('recording.speechRecognitionResult')}
          </h3>
          <div className="bg-black/20 rounded p-3 mb-4">
            <p className="text-white text-sm whitespace-pre-wrap">
              {pendingTranscription}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleProcessWithAi}
              disabled={!selectedAgent}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg transition-colors"
            >
              {t('recording.processWithAi')}
            </button>
            <button
              onClick={handleCopyTranscription}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              {t('recording.copyTranscription')}
            </button>
            <button
              onClick={skipAiProcessing}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t('recording.skip')}
            </button>
          </div>
        </div>
      )}

      <ResultsSection />
    </div>
  );
}