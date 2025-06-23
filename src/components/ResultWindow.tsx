import React, { useState } from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';

type TabType = 'stt' | 'llm';

export default function ResultWindow() {
  const { llmResult, sttResult, copyToClipboard, currentState, settings, selectedAgent } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('stt');


  // Check processing states
  const isProcessingSTT = currentState === AppState.PROCESSING_STT;
  const isProcessingLLM = currentState === AppState.PROCESSING_LLM;
  const isProcessing = isProcessingSTT || isProcessingLLM;

  // Get current agent information
  const currentAgent = selectedAgent && settings ? 
    settings.agents.find(a => a.id === selectedAgent) : null;
  
  // Get agent from LLM result if available
  const resultAgent = llmResult && settings ? 
    settings.agents.find(a => a.id === llmResult.agentId) : null;
  
  // Current timestamp for display
  const currentTime = new Date().toLocaleString('ja-JP');


  // Auto-switch tabs based on processing state
  React.useEffect(() => {
    if (isProcessingLLM || llmResult) {
      setActiveTab('llm');
    } else if (isProcessingSTT) {
      setActiveTab('stt');
    }
  }, [isProcessingSTT, isProcessingLLM, llmResult]);

  const handleCopy = (type: TabType) => {
    const text = type === 'stt' ? sttResult?.text : llmResult?.llmResult?.text;
    if (text) {
      copyToClipboard(text);
    }
  };

  const handleClose = () => {
    window.electronAPI.closeResultWindow?.();
  };

  // Show window if either STT or LLM result exists
  const hasResults = sttResult || llmResult?.llmResult?.text;

  return (
    <div className="p-4 bg-gray-800 text-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">処理結果</h2>
          <div className="text-sm text-gray-400 mt-1">
            {resultAgent && (
              <span className="inline-flex items-center">
                🤖 {resultAgent.name}
                <div 
                  className="w-2 h-2 rounded-full ml-2 mr-3"
                  style={{ backgroundColor: resultAgent.color }}
                />
              </span>
            )}
            {currentAgent && !resultAgent && (
              <span className="inline-flex items-center">
                🤖 {currentAgent.name}
                <div 
                  className="w-2 h-2 rounded-full ml-2 mr-3"
                  style={{ backgroundColor: currentAgent.color }}
                />
              </span>
            )}
            <span>🕒 {llmResult?.timestamp ? new Date(llmResult.timestamp).toLocaleString('ja-JP') : currentTime}</span>
          </div>
        </div>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-gray-600">
        <button
          onClick={() => setActiveTab('stt')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === 'stt'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          📝 音声認識結果
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === 'llm'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          🧠 AI処理結果
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'stt' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-white">音声認識結果</h3>
              <button
                onClick={() => handleCopy('stt')}
                disabled={!sttResult?.text || isProcessingSTT}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg transition-colors text-sm"
              >
                📋 コピー
              </button>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 min-h-[200px]">
              {isProcessingSTT ? (
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
                  <p className="text-white text-sm">音声認識中...</p>
                </div>
              ) : (
                <pre className="text-sm text-white whitespace-pre-wrap break-words">
                  {sttResult?.text || '音声認識結果がここに表示されます'}
                </pre>
              )}
            </div>
            {sttResult && !isProcessingSTT && (
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <div>
                  言語: {sttResult.language} | 
                  信頼度: {(sttResult.confidence * 100).toFixed(1)}%
                </div>
                {(currentAgent || resultAgent) && (
                  <div className="flex items-center">
                    🤖 使用エージェント: {(resultAgent || currentAgent)?.name}
                    <div 
                      className="w-2 h-2 rounded-full ml-1"
                      style={{ backgroundColor: (resultAgent || currentAgent)?.color }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'llm' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-semibold text-white">AI処理結果</h3>
              <button
                onClick={() => handleCopy('llm')}
                disabled={!llmResult?.llmResult?.text || isProcessingLLM}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg transition-colors text-sm"
              >
                📋 コピー
              </button>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 min-h-[200px]">
              {isProcessingLLM ? (
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
                  <p className="text-white text-sm">AI処理中...</p>
                </div>
              ) : (
                <pre className="text-sm text-white whitespace-pre-wrap break-words">
                  {llmResult?.llmResult?.text || 'AI処理結果がここに表示されます'}
                </pre>
              )}
            </div>
            {llmResult && !isProcessingLLM && (
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <div>
                  使用モデル: {llmResult.llmResult.model} | 
                  トークン使用量: {llmResult.llmResult.tokensUsed}
                </div>
                {resultAgent && (
                  <div className="flex items-center">
                    🤖 使用エージェント: {resultAgent.name}
                    <div 
                      className="w-2 h-2 rounded-full ml-1"
                      style={{ backgroundColor: resultAgent.color }}
                    />
                  </div>
                )}
                <div>
                  🕒 処理完了時刻: {new Date(llmResult.timestamp).toLocaleString('ja-JP')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}