import React from 'react';

import { useApp } from '../context/AppContext';
import { t } from '../utils/i18n';

import HistorySection from './HistorySection';

export default function HistoryScreen() {
  const { history, deleteHistoryEntry, clearHistory, playAudioFile, copyToClipboard } = useApp();

  return (
    <div className="hud-panel p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">{t('tab.history')}</h2>
      <HistorySection 
        history={history}
        onDeleteEntry={deleteHistoryEntry}
        onClearHistory={clearHistory}
        onPlayAudio={playAudioFile}
        onCopyText={copyToClipboard}
      />
    </div>
  );
}