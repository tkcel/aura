import React from 'react';

import { useApp } from '../context/AppContext';

import HistorySection from './HistorySection';

export default function HistoryScreen() {
  const { history, deleteHistoryEntry, clearHistory, playAudioFile, copyToClipboard } = useApp();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">履歴</h2>
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