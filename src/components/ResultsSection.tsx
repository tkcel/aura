import React, { useState } from 'react';

import { useApp } from '../context/AppContext';

type TabType = 'stt' | 'llm';

export default function ResultsSection() {
  const { sttResult, llmResult, copyToClipboard } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('stt');

  // Auto-switch to LLM tab when result is available
  React.useEffect(() => {
    if (llmResult) {
      setActiveTab('llm');
    }
  }, [llmResult]);

  const handleCopy = (type: TabType) => {
    const text = type === 'stt' ? sttResult?.text : llmResult?.llmResult.text;
    if (text) {
      copyToClipboard(text);
    }
  };

  return (
    <section className="card p-6">
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stt')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === 'stt'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📝 音声認識結果
        </button>
        <button
          onClick={() => setActiveTab('llm')}
          className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
            activeTab === 'llm'
              ? 'bg-primary-500 text-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🧠 AI処理結果
        </button>
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'stt' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">音声認識結果</h3>
              <button
                onClick={() => handleCopy('stt')}
                disabled={!sttResult?.text}
                className="btn btn-small btn-secondary"
              >
                📋 コピー
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[150px] font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {sttResult?.text || '音声認識結果がここに表示されます'}
            </div>
          </div>
        )}

        {activeTab === 'llm' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">AI処理結果</h3>
              <button
                onClick={() => handleCopy('llm')}
                disabled={!llmResult?.llmResult.text}
                className="btn btn-small btn-secondary"
              >
                📋 コピー
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[150px] font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {llmResult?.llmResult.text || 'AI処理結果がここに表示されます'}
            </div>
            {llmResult && (
              <div className="mt-2 text-xs text-gray-500">
                使用モデル: {llmResult.llmResult.model} | 
                トークン使用量: {llmResult.llmResult.tokensUsed}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}