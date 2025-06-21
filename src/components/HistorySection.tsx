import React, { useState, useEffect } from 'react';

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
    return new Intl.DateTimeFormat('ja-JP', {
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
    if (duration < 60) return `${duration}秒`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}分${seconds}秒`;
  };

  const truncateText = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isExpanded) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            📚 履歴
            <span className="text-sm text-gray-600">({history.length}件)</span>
          </h2>
          <button
            onClick={() => setIsExpanded(true)}
            className="btn btn-outline btn-sm"
          >
            履歴を表示
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📚 履歴
          <span className="text-sm text-gray-600">({filteredHistory.length}/{history.length}件)</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="btn btn-outline btn-sm"
          >
            非表示
          </button>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="btn btn-danger btn-sm"
              title="全履歴を削除"
            >
              🗑️ 全削除
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>📝 まだ履歴がありません</p>
          <p className="text-sm">録音を開始すると、ここに履歴が表示されます</p>
        </div>
      ) : (
        <>
          {/* Search and Filter Controls */}
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="履歴を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input flex-1"
              />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="select"
              >
                <option value="all">全エージェント</option>
                {uniqueAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p>🔍 検索条件に一致する履歴がありません</p>
              </div>
            ) : (
              filteredHistory.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {entry.agentName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      {entry.duration && (
                        <span className="text-sm text-gray-500">
                          ({formatDuration(entry.duration)})
                        </span>
                      )}
                      {entry.audioFilePath && (
                        <span className="text-sm text-green-600" title="音声ファイル保存済み">
                          🎵
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {entry.audioFilePath && (
                        <button
                          onClick={() => entry.audioFilePath && onPlayAudio(entry.audioFilePath)}
                          className="btn btn-outline btn-xs"
                          title="音声を再生"
                        >
                          ▶️
                        </button>
                      )}
                      <button
                        onClick={() => onCopyText(entry.response)}
                        className="btn btn-outline btn-xs"
                        title="回答をコピー"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="btn btn-danger btn-xs"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">📝 認識結果:</div>
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {truncateText(entry.transcription)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">🤖 回答:</div>
                      <div className="text-sm bg-blue-50 p-2 rounded">
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
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 grid grid-cols-2 gap-2">
                <div>📊 総件数: {history.length}件</div>
                <div>🎵 音声付き: {history.filter(e => e.audioFilePath).length}件</div>
                <div>📅 最新: {history[0] ? formatTimestamp(history[0].timestamp) : '-'}</div>
                <div>🕒 平均時間: {
                  (() => {
                    const withDuration = history.filter(e => e.duration);
                    if (withDuration.length === 0) return '-';
                    const avg = withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
                    return formatDuration(Math.round(avg));
                  })()
                }</div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}