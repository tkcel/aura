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

  const handleCopyAll = () => {
    const sttText = sttResult?.text || '';
    const llmText = llmResult?.llmResult.text || '';
    if (sttText || llmText) {
      const combinedText = `音声認識: ${sttText}\n\nAI処理: ${llmText}`;
      copyToClipboard(combinedText);
    }
  };

  return (
    <section className="hud-border-corner p-6">
      {/* Tab Navigation */}
      <div className="border-b border-white/20 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('stt')}
              className={`hud-tab ${activeTab === 'stt' ? 'active' : ''}`}
            >
              VOICE RECOGNITION
            </button>
            <button
              onClick={() => setActiveTab('llm')}
              className={`hud-tab ${activeTab === 'llm' ? 'active' : ''}`}
            >
              AI PROCESSING
            </button>
          </div>
          {(sttResult?.text || llmResult?.llmResult.text) && (
            <button
              onClick={handleCopyAll}
              className="hud-btn hud-btn-primary"
              title="COPY ALL CONTENT"
            >
              COPY ALL
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[250px]">
        {activeTab === 'stt' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="hud-subtitle">SPEECH-TO-TEXT OUTPUT</h3>
              <button
                onClick={() => handleCopy('stt')}
                disabled={!sttResult?.text}
                className="hud-btn hud-btn-primary"
              >
                COPY DATA
              </button>
            </div>
            <div className="hud-border-corner p-4 bg-black/30 min-h-[180px]">
              <pre className="hud-text whitespace-pre-wrap break-words selectable">
                {sttResult?.text || 'AWAITING VOICE INPUT...'}
              </pre>
            </div>
            {sttResult && (
              <div className="mt-3 hud-label text-white/50">
                LANGUAGE: {sttResult.language?.toUpperCase()} | 
                CONFIDENCE: {(sttResult.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}

        {activeTab === 'llm' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="hud-subtitle">ARTIFICIAL INTELLIGENCE OUTPUT</h3>
              <button
                onClick={() => handleCopy('llm')}
                disabled={!llmResult?.llmResult.text}
                className="hud-btn hud-btn-primary"
              >
                COPY DATA
              </button>
            </div>
            <div className="hud-border-corner p-4 bg-white/5 min-h-[180px]">
              <pre className="hud-text whitespace-pre-wrap break-words selectable">
                {llmResult?.llmResult.text || 'AWAITING AI PROCESSING...'}
              </pre>
            </div>
            {llmResult && (
              <div className="mt-3 hud-label text-white/50">
                MODEL: {llmResult.llmResult.model?.toUpperCase()} | 
                TOKENS: {llmResult.llmResult.tokensUsed}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}