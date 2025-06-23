import React from 'react';

import { useApp } from '../context/AppContext';

export default function RecordingControls() {
  const { selectedAgent, isRecording, startRecording, stopRecording } = useApp();

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getButtonContent = () => {
    if (isRecording) {
      return (
        <>
          <span className="text-2xl">⏹️</span>
          <span>録音停止</span>
        </>
      );
    } else if (selectedAgent) {
      return (
        <>
          <span className="text-2xl">🎤</span>
          <span>録音開始</span>
        </>
      );
    } else {
      return (
        <>
          <span className="text-2xl">🎤</span>
          <span>エージェントを選択</span>
        </>
      );
    }
  };

  const getButtonClass = () => {
    if (isRecording) {
      return "btn btn-danger btn-large"; // 録音中は赤色
    } else {
      return "btn btn-primary btn-large"; // 通常は青色
    }
  };

  return (
    <section className="mb-8">
      <div className="flex justify-center">
        <button
          onClick={handleRecordingToggle}
          disabled={!selectedAgent}
          className={getButtonClass()}
        >
          {getButtonContent()}
        </button>
      </div>
    </section>
  );
}