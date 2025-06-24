import React, { useState } from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';
import { t } from '../utils/i18n';

type TabType = 'stt' | 'llm';

export default function ResultWindow() {
  const { llmResult, sttResult, copyToClipboard, currentState, settings, selectedAgent, language, error } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('stt');

  // Check processing states
  const isProcessingSTT = currentState === AppState.PROCESSING_STT;
  const isProcessingLLM = currentState === AppState.PROCESSING_LLM;
  const isProcessing = isProcessingSTT || isProcessingLLM;
  const isError = currentState === AppState.ERROR;

  // Get the current selected agent (always use this for display)
  const currentAgentConfig = selectedAgent && settings ? 
    settings.agents.find(a => a.id === selectedAgent) : null;
  const isAiEnabled = currentAgentConfig?.autoProcessAi ?? false;

  // Display agent should always be the currently selected agent
  const displayAgent = currentAgentConfig;
  
  // Use the result timestamp if available, otherwise current time
  const displayTime = llmResult?.timestamp ? 
    new Date(llmResult.timestamp).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US') :
    new Date().toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US');

  // Auto-switch tabs based on processing state
  React.useEffect(() => {
    if (isError) {
      // Don't change tabs when in error state
      return;
    }
    
    if (isAiEnabled && (isProcessingLLM || llmResult)) {
      setActiveTab('llm');
    } else if (isProcessingSTT) {
      setActiveTab('stt');
    }
  }, [isProcessingSTT, isProcessingLLM, llmResult, isAiEnabled, isError]);

  // Debug logging to track state changes (remove in production)
  React.useEffect(() => {
    console.log('ResultWindow state changed:', {
      currentState,
      isError,
      error,
      sttResult: !!sttResult,
      llmResult: !!llmResult
    });
  }, [currentState, isError, error, sttResult, llmResult]);

  const handleCopy = (type: TabType) => {
    const text = type === 'stt' ? sttResult?.text : llmResult?.llmResult?.text;
    if (text) {
      copyToClipboard(text);
    }
  };

  const handleCopyAll = () => {
    const sttText = sttResult?.text || '';
    const llmText = llmResult?.llmResult?.text || '';
    if (sttText || llmText) {
      const combinedText = `音声認識: ${sttText}\n\nAI処理: ${llmText}`;
      copyToClipboard(combinedText);
    }
  };

  const handleClose = () => {
    window.electronAPI.closeResultWindow?.();
  };

  const getStatusIcon = () => {
    if (isError) return { icon: "✗", animation: "" };
    if (isProcessingSTT) return { icon: "◐", animation: "hud-animate-spin" };
    if (isProcessingLLM) return { icon: "◑", animation: "hud-animate-spin" };
    if (llmResult) return { icon: "◉", animation: "" };
    if (sttResult) return { icon: "●", animation: "" };
    return { icon: "◦", animation: "" };
  };

  const statusIcon = getStatusIcon();

  return (
    <div className="h-screen bg-black text-white hud-scanlines flex flex-col">
      {/* HUD Container */}
      <div className="hud-panel flex-1 hud-border-corner flex flex-col overflow-hidden">
        {/* Header */}
        <div className="hud-panel-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`text-2xl ${statusIcon.animation}`}>
                {statusIcon.icon}
              </div>
              <div>
                <h2 className="hud-title">{t('results.title')}</h2>
                <div className="hud-subtitle mt-1">
                  {displayAgent && (
                    <span className="inline-flex items-center gap-2">
                      {t('results.agent')}: {displayAgent.name.toUpperCase()}
                      <div 
                        className="w-2 h-2 rounded-full border border-white/30" 
                        style={{ backgroundColor: displayAgent.color }}
                      />
                    </span>
                  )}
                  {displayAgent && <span className="mx-3">|</span>}
                  <span>{t('results.timestamp')}: {displayTime}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="hud-btn text-white/60 hover:text-white"
            >
              {t('results.terminate')}
            </button>
          </div>
        </div>
        
        {/* Tab Navigation - Hidden on error */}
        {!isError && (
          <div className="border-b border-white/20 px-6 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('stt')}
                  className={`hud-tab ${activeTab === 'stt' ? 'active' : ''}`}
                >
                  {t('results.voiceTab')}
                </button>
                {isAiEnabled && (
                  <button
                    onClick={() => setActiveTab('llm')}
                    className={`hud-tab ${activeTab === 'llm' ? 'active' : ''}`}
                  >
                    {t('results.aiTab')}
                  </button>
                )}
              </div>
              {(sttResult?.text || llmResult?.llmResult?.text) && (
                <button
                  onClick={handleCopyAll}
                  className="hud-btn hud-btn-primary"
                  title={t('results.copyAllContent')}
                >
                  {t('results.copyAll') || 'COPY ALL'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {isError ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="hud-subtitle text-red-400">RECORDING ERROR</h3>
              </div>
              
              <div className="hud-border-corner p-4 border-red-500/30">
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="text-4xl mb-4 text-red-400">✗</div>
                  <p className="hud-text text-red-300 text-center">RECORDING FAILED</p>
                  {error && (
                    <pre className="hud-text text-red-200 text-center mt-4 whitespace-pre-wrap break-words max-w-md">
                      {error}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'stt' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="hud-subtitle">{t('results.sttOutput')}</h3>
                <button
                  onClick={() => handleCopy('stt')}
                  disabled={!sttResult?.text || isProcessingSTT}
                  className="hud-btn hud-btn-primary"
                >
                  {t('results.copyData')}
                </button>
              </div>
              
              <div className="hud-border-corner p-4">
                {isProcessingSTT ? (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <div className="text-4xl hud-animate-spin mb-4">◐</div>
                    <p className="hud-text">ANALYZING VOICE INPUT...</p>
                  </div>
                ) : (
                  <div className="selectable">
                    <pre className="hud-text whitespace-pre-wrap break-words">
                      {sttResult?.text || 'AWAITING VOICE INPUT...'}
                    </pre>
                  </div>
                )}
              </div>
              
              {sttResult && !isProcessingSTT && (
                <div className="space-y-2 text-white/50">
                  <div className="hud-label">
                    {t('results.language')}: {sttResult.language?.toUpperCase()} | 
                    {t('results.confidence')}: {(sttResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'llm' && isAiEnabled && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="hud-subtitle">{t('results.aiOutput')}</h3>
                <button
                  onClick={() => handleCopy('llm')}
                  disabled={!llmResult?.llmResult?.text || isProcessingLLM}
                  className="hud-btn hud-btn-primary"
                >
                  {t('results.copyData')}
                </button>
              </div>
              
              <div className="hud-border-corner p-4">
                {isProcessingLLM ? (
                  <div className="flex flex-col items-center justify-center h-[200px]">
                    <div className="text-4xl hud-animate-spin mb-4">◑</div>
                    <p className="hud-text">{t('results.neuralProcessing')}</p>
                  </div>
                ) : (
                  <div className="selectable">
                    <pre className="hud-text whitespace-pre-wrap break-words">
                      {llmResult?.llmResult?.text || t('results.awaitingAi')}
                    </pre>
                  </div>
                )}
              </div>
              
              {llmResult && !isProcessingLLM && (
                <div className="space-y-2 text-white/50">
                  <div className="hud-label">
                    {t('results.model')}: {llmResult.llmResult.model?.toUpperCase()} | 
                    {t('results.tokens')}: {llmResult.llmResult.tokensUsed}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Unified Meta Information */}
        {(sttResult || llmResult) && !isProcessing && !isError && (
          <div className="border-t border-white/20 px-6 py-4 bg-white/5 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white/60">
              {/* Agent Info */}
              {displayAgent && (
                <div className="hud-label text-center">
                  <div className="text-white/40 text-xs mb-1">{t('results.agent')}</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white/80">{displayAgent.name.toUpperCase()}</span>
                    <div 
                      className="w-2 h-2 rounded-full border border-white/30" 
                      style={{ backgroundColor: displayAgent.color }}
                    />
                  </div>
                </div>
              )}
              
              {/* Language & Confidence (STT) */}
              {sttResult && (
                <div className="hud-label text-center">
                  <div className="text-white/40 text-xs mb-1">{t('results.language')}</div>
                  <div className="text-white/80">
                    {sttResult.language?.toUpperCase()} ({(sttResult.confidence * 100).toFixed(0)}%)
                  </div>
                </div>
              )}
              
              {/* Model & Tokens (LLM) */}
              {llmResult && (
                <div className="hud-label text-center">
                  <div className="text-white/40 text-xs mb-1">{t('results.model')}</div>
                  <div className="text-white/80">
                    {llmResult.llmResult.model?.toUpperCase().replace('GPT-', '')} ({llmResult.llmResult.tokensUsed})
                  </div>
                </div>
              )}
              
              {/* Completion Time */}
              {llmResult && (
                <div className="hud-label text-center">
                  <div className="text-white/40 text-xs mb-1">{t('results.completion')}</div>
                  <div className="text-white/80 text-xs">
                    {displayTime}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}