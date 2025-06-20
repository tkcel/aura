import React from 'react';
import { useApp } from '../context/AppContext';
import { AppState } from '../types';

export default function BarWindow() {
  const { currentState, isRecording, startRecording, stopRecording, settings, selectAgent, selectedAgent } = useApp();

  const handleBarClick = () => {
    // Show settings window when bar is clicked
    window.electronAPI.showSettingsWindow?.();
  };

  const handleRecordingToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening settings when clicking record button
    if (isRecording) {
      stopRecording();
    } else {
      // Select first available agent if none selected
      if (!selectedAgent && settings?.agents?.length > 0) {
        const firstEnabledAgent = settings.agents.find(agent => agent.enabled);
        if (firstEnabledAgent) {
          selectAgent(firstEnabledAgent.id);
        }
      }
      startRecording();
    }
  };

  const getStateIndicator = () => {
    switch (currentState) {
      case AppState.RECORDING:
        return { text: '🎤 録音中...', color: 'text-red-500' };
      case AppState.PROCESSING_STT:
        return { text: '📝 文字起こし中...', color: 'text-blue-500' };
      case AppState.PROCESSING_LLM:
        return { text: '🤖 処理中...', color: 'text-purple-500' };
      case AppState.COMPLETED:
        return { text: '✅ 完了', color: 'text-green-500' };
      case AppState.ERROR:
        return { text: '❌ エラー', color: 'text-red-500' };
      default:
        return { text: '🎯 Aura', color: 'text-gray-700' };
    }
  };

  const stateInfo = getStateIndicator();

  return (
    <div 
      className="h-full bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center px-4 cursor-pointer hover:bg-white/100 transition-all duration-200"
      onClick={handleBarClick}
    >
      {/* App Icon/Name */}
      <div className="flex items-center gap-3 flex-1">
        <span className={`text-sm font-medium ${stateInfo.color} transition-colors duration-200`}>
          {stateInfo.text}
        </span>
      </div>

      {/* Recording Button */}
      <button
        onClick={handleRecordingToggle}
        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-xs ${
          isRecording 
            ? 'bg-red-500 border-red-500 text-white animate-pulse' 
            : 'bg-white border-gray-300 hover:border-red-400 text-gray-600'
        }`}
        title={isRecording ? "録音を停止" : "録音を開始"}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>
    </div>
  );
}