import React, { useState, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { HistoryEntry } from '../types';

interface HistorySectionProps {
  history: HistoryEntry[];
  onDeleteEntry: (id: string) => void;
  onClearHistory: () => void;
  onPlayAudio: (filePath: string) => void;
  onCopyText: (text: string) => void;
}

export default function HistorySection({ 
  history, 
  onDeleteEntry, 
  onClearHistory, 
  onPlayAudio, 
  onCopyText 
}: HistorySectionProps) {
  const { language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>(history);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let filtered = history;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.transcription.toLowerCase().includes(query) ||
        entry.response.toLowerCase().includes(query) ||
        entry.agentName.toLowerCase().includes(query)
      );
    }

    // Filter by agent
    if (selectedAgent !== 'all') {
      filtered = filtered.filter(entry => entry.agentId === selectedAgent);
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, selectedAgent]);

  const uniqueAgents = Array.from(new Set(history.map(entry => entry.agentId)))
    .map(agentId => {
      const entry = history.find(e => e.agentId === agentId);
      return { id: agentId, name: entry?.agentName || agentId };
    });

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 60) return `${duration}S`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}M${seconds}S`;
  };

  const truncateText = (text: string, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isExpanded) {
    return (
      <section className="mb-8">
        <div className="hud-border-corner p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="hud-subtitle">DATA ARCHIVE</h2>
              <span className="hud-label">({history.length} ENTRIES)</span>
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="hud-btn"
            >
              EXPAND ARCHIVE
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="hud-border-corner p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="hud-subtitle">DATA ARCHIVE SYSTEM</h2>
            <span className="hud-label">({filteredHistory.length}/{history.length} ENTRIES)</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsExpanded(false)}
              className="hud-btn"
            >
              COLLAPSE
            </button>
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="hud-btn hud-btn-danger"
                title="PURGE ALL DATA"
              >
                PURGE ALL
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 text-white/30">◦</div>
            <p className="hud-text text-white/60">NO DATA ARCHIVED</p>
            <p className="hud-label text-white/40 mt-2">BEGIN RECORDING TO POPULATE ARCHIVE</p>
          </div>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="SEARCH ARCHIVE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="hud-input flex-1"
                />
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="hud-select w-48"
                >
                  <option value="all">ALL AGENTS</option>
                  {uniqueAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2 text-white/30">◐</div>
                  <p className="hud-text text-white/60">NO MATCHING RECORDS</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <div key={entry.id} className="hud-border-corner p-4 bg-white/5 border border-white/20">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="hud-label bg-white/10 px-2 py-1">
                          {entry.agentName.toUpperCase()}
                        </span>
                        <span className="hud-label text-white/60">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                        {entry.duration && (
                          <span className="hud-label text-white/60">
                            ({formatDuration(entry.duration)})
                          </span>
                        )}
                        {entry.audioFilePath && (
                          <div className="w-2 h-2 hud-status-dot recording" title="AUDIO ARCHIVED" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        {entry.audioFilePath && (
                          <button
                            onClick={() => entry.audioFilePath && onPlayAudio(entry.audioFilePath)}
                            className="hud-btn text-xs"
                            title="PLAY AUDIO"
                          >
                            PLAY
                          </button>
                        )}
                        <button
                          onClick={() => onCopyText(entry.transcription)}
                          className="hud-btn text-xs"
                          title="COPY TRANSCRIPTION"
                        >
                          COPY STT
                        </button>
                        <button
                          onClick={() => onCopyText(entry.response)}
                          className="hud-btn text-xs"
                          title="COPY AI RESPONSE"
                        >
                          COPY AI
                        </button>
                        <button
                          onClick={() => onCopyText(`音声認識: ${entry.transcription}\n\nAI処理: ${entry.response}`)}
                          className="hud-btn text-xs"
                          title="COPY ALL CONTENT"
                        >
                          COPY ALL
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="hud-btn hud-btn-danger text-xs"
                          title="DELETE ENTRY"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                      <div>
                        <div className="hud-label mb-2">VOICE INPUT:</div>
                        <div className="hud-text bg-black/30 p-3 border border-white/10 selectable">
                          {truncateText(entry.transcription)}
                        </div>
                      </div>
                      <div>
                        <div className="hud-label mb-2">AI RESPONSE:</div>
                        <div className="hud-text bg-white/5 p-3 border border-white/20 selectable">
                          {truncateText(entry.response)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Statistics */}
            {history.length > 0 && (
              <div className="mt-6 hud-border-corner p-4 bg-white/5">
                <div className="hud-label mb-3">ARCHIVE STATISTICS</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="hud-text text-white/80">{history.length}</div>
                    <div className="hud-label text-white/50">TOTAL ENTRIES</div>
                  </div>
                  <div className="text-center">
                    <div className="hud-text text-white/80">{history.filter(e => e.audioFilePath).length}</div>
                    <div className="hud-label text-white/50">WITH AUDIO</div>
                  </div>
                  <div className="text-center">
                    <div className="hud-text text-white/80">
                      {history[0] ? formatTimestamp(history[0].timestamp).split(' ')[0] : '-'}
                    </div>
                    <div className="hud-label text-white/50">LATEST</div>
                  </div>
                  <div className="text-center">
                    <div className="hud-text text-white/80">{
                      (() => {
                        const withDuration = history.filter(e => e.duration);
                        if (withDuration.length === 0) return '-';
                        const avg = withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
                        return formatDuration(Math.round(avg));
                      })()
                    }</div>
                    <div className="hud-label text-white/50">AVG DURATION</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}