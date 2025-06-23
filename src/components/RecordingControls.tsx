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
      return {
        icon: "■",
        text: "TERMINATE RECORDING",
        status: "RECORDING"
      };
    } else if (selectedAgent) {
      return {
        icon: "●",
        text: "INITIATE RECORDING",
        status: "READY"
      };
    } else {
      return {
        icon: "◦",
        text: "SELECT AGENT FIRST",
        status: "WAITING"
      };
    }
  };

  const buttonContent = getButtonContent();

  return (
    <section className="mb-8">
      <div className="hud-border-corner p-6">
        <div className="text-center">
          <h2 className="hud-subtitle mb-6">RECORDING INTERFACE</h2>
          
          <div className="flex flex-col items-center gap-4">
            {/* Status Display */}
            <div className="hud-label text-white/60">
              STATUS: {buttonContent.status}
            </div>
            
            {/* Main Recording Button */}
            <button
              onClick={handleRecordingToggle}
              disabled={!selectedAgent}
              className={`
                relative w-24 h-24 rounded-full border-2 transition-all duration-300
                flex items-center justify-center text-4xl
                ${isRecording 
                  ? 'border-white/80 bg-white/20 text-white animate-pulse' 
                  : selectedAgent
                  ? 'border-white/60 bg-white/10 text-white/90 hover:border-white hover:bg-white/20'
                  : 'border-white/30 bg-white/5 text-white/50 cursor-not-allowed'
                }
              `}
            >
              <div className="text-center">
                <div className={isRecording ? 'animate-pulse' : ''}>
                  {buttonContent.icon}
                </div>
              </div>
              
              {/* Pulse Animation for Recording */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>
              )}
            </button>
            
            {/* Action Text */}
            <div className="hud-text text-center">
              {buttonContent.text}
            </div>
            
            {/* Agent Info */}
            {selectedAgent && (
              <div className="hud-label text-white/60 text-center">
                AGENT READY FOR VOICE INPUT
              </div>
            )}
            
            {!selectedAgent && (
              <div className="hud-label text-white/40 text-center">
                NO AGENT SELECTED
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}