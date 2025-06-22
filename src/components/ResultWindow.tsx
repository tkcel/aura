import React from 'react';

import { useApp } from '../context/AppContext';

export default function ResultWindow() {
  const { llmResult, copyToClipboard } = useApp();

  const handleCopy = () => {
    if (llmResult?.llmResult?.text) {
      copyToClipboard(llmResult.llmResult.text);
    }
  };

  const handleClose = () => {
    window.electronAPI.closeResultWindow?.();
  };

  if (!llmResult?.llmResult?.text) {
    return (
      <div className="p-4 bg-gray-800 text-white min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">処理結果</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-400">結果がありません</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 text-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">処理結果</h2>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <pre className="text-sm text-white whitespace-pre-wrap break-words">
          {llmResult.llmResult.text}
        </pre>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          📋 コピー
        </button>
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