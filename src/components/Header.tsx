import React from 'react';

import IdleReactor from '../assets/reactors/idle.svg';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { language, isOnline } = useApp();
  return (
    <header className="hud-panel-header border-b border-white/20 relative">
      {/* Background geometric pattern */}
      <div className="absolute inset-0 hud-grid opacity-30"></div>
      
      <div className="relative flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* Main title with JARVIS styling */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {/* Reactor logo/icon */}
              <div className="w-8 h-8 border-2 border-white/40 bg-white/10 flex items-center justify-center p-1">
                <img src={IdleReactor} alt="A.R.I.A." className="w-full h-full opacity-80" />
              </div>
              
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white/60"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white/60"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white/60"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white/60"></div>
            </div>
            
            <div>
              <h1 className="hud-title">A.R.I.A.</h1>
              <div className="hud-label text-white/50">AUTONOMOUS RESPONSE & INTELLIGENCE ASSISTANT</div>
            </div>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex flex-col items-end gap-2">
          {/* System status */}
          <div className="flex items-center gap-3">
            <div className="hud-label text-white/60">SYSTEM STATUS:</div>
            <div className="flex items-center gap-2">
              <div 
                className={`w-2 h-2 rounded-full border border-white/30 ${
                  isOnline ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
                }`}
                style={{ 
                  boxShadow: isOnline 
                    ? '0 0 10px rgba(34, 197, 94, 0.5)' 
                    : '0 0 10px rgba(239, 68, 68, 0.5)' 
                }}
              ></div>
              <span className="hud-label text-white/70">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          
          {/* Version info */}
          <div className="hud-label text-white/40">
            v1.0.2
          </div>
        </div>
      </div>
      
      {/* Bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
    </header>
  );
}