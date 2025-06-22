import React, { useState } from 'react';

import { useApp } from '../context/AppContext';

import SettingsModal from './SettingsModal';

export default function SettingsScreen() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, selectedAgent, selectAgent } = useApp();

  if (!settings) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">設定</h2>
        <p className="text-gray-400">設定を読み込み中...</p>
      </div>
    );
  }

  const enabledAgents = settings.agents.filter(agent => agent.enabled);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">設定</h2>
      
      {/* Current Agent Selection */}
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">現在選択中のエージェント</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedAgent === agent.id 
                  ? 'border-blue-500 bg-blue-500/20 text-white' 
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500 hover:bg-gray-600/50'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">
                  {agent.name}
                </div>
                <div 
                  className="w-4 h-4 rounded-full border border-gray-400"
                  style={{ backgroundColor: agent.color }}
                />
              </div>
              <div className="text-sm opacity-70">
                {agent.hotkey}
              </div>
              <div className="text-xs opacity-50 mt-1">
                AI自動処理: {agent.autoProcessAi ? '有効' : '無効'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Button */}
      <div className="bg-white/5 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">アプリケーション設定</h3>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          詳細設定を開く
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          embedded={false}
        />
      )}
    </div>
  );
}