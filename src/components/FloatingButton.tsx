import React, { useState, useEffect, useRef } from 'react';

import { useApp } from '../context/AppContext';
import { AppState } from '../types';
import { t } from '../utils/i18n';

export default function FloatingButton() {
  const { currentState, isRecording, startRecording, stopRecording, settings, selectAgent, selectedAgent } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Load saved position or use default
  const savedPosition = localStorage.getItem('floatingButtonPosition');
  const defaultPosition = savedPosition 
    ? JSON.parse(savedPosition) 
    : { x: window.innerWidth - 80, y: 40 };
  
  const [position, setPosition] = useState(defaultPosition);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.floating-menu')) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isExpanded]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragStart.x)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragStart.y))
      };
      setPosition(newPosition);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Save position to localStorage
    localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
    return undefined;
  }, [isDragging, dragStart]);

  const handleMainButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) {
      setIsExpanded(false);
    } else if (isRecording) {
      stopRecording();
    } else {
      // Select first available agent if none selected
      if (!selectedAgent && settings && Array.isArray(settings.agents) && settings.agents.length > 0) {
        const firstEnabledAgent = settings.agents.find(agent => agent.enabled);
        if (firstEnabledAgent) {
          selectAgent(firstEnabledAgent.id);
        }
      }
      startRecording();
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI.showSettingsWindow?.();
    setIsExpanded(false);
  };

  const handleAgentClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    selectAgent(agentId);
    setIsExpanded(false);
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI.hideBarWindow?.();
    setIsExpanded(false);
  };

  const getMainButtonStyle = () => {
    switch (currentState) {
      case AppState.IDLE:
        return 'bg-gray-800 hover:bg-gray-700 shadow-gray-800/50';
      case AppState.RECORDING:
        return 'bg-red-500 animate-pulse shadow-red-500/50';
      case AppState.PROCESSING_STT:
      case AppState.PROCESSING_LLM:
        return 'bg-purple-500 animate-spin shadow-purple-500/50';
      case AppState.COMPLETED:
        return 'bg-green-500 shadow-green-500/50';
      case AppState.ERROR:
        return 'bg-red-500 shadow-red-500/50';
      default:
        return 'bg-gray-800 hover:bg-gray-700 shadow-gray-800/50';
    }
  };

  const getMainButtonIcon = () => {
    if (isRecording) return '■';
    switch (currentState) {
      case AppState.PROCESSING_STT:
      case AppState.PROCESSING_LLM:
        return '◐';
      case AppState.COMPLETED:
        return '◉';
      case AppState.ERROR:
        return '○';
      default:
        return '●';
    }
  };

  const availableAgents = settings && Array.isArray(settings.agents)
    ? settings.agents.filter(a => a.enabled)
    : [];

  // Handle mouse enter/leave to control click-through
  const handleMouseEnter = () => {
    window.electronAPI.setIgnoreMouseEvents?.(false);
  };

  const handleMouseLeave = () => {
    if (!isDragging && !isExpanded) {
      window.electronAPI.setIgnoreMouseEvents?.(true);
    }
  };

  // Update mouse event handling when dragging or menu state changes
  useEffect(() => {
    if (isDragging || isExpanded) {
      window.electronAPI.setIgnoreMouseEvents?.(false);
    } else {
      window.electronAPI.setIgnoreMouseEvents?.(true);
    }
  }, [isDragging, isExpanded]);

  return (
    <div 
      ref={buttonRef}
      className="floating-menu fixed"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        zIndex: 10 
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main floating button */}
      <button
        className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-all duration-200 ${getMainButtonStyle()} ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
        onClick={handleMainButtonClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }}
        onMouseDown={handleDragStart}
        title={isRecording ? "録音を停止 (クリック) / メニューを開く (右クリック)" : "録音を開始 (クリック) / メニューを開く (右クリック)"}
      >
        <span className="text-lg select-none">{getMainButtonIcon()}</span>
      </button>

      {/* Expanded menu */}
      {isExpanded && (
        <div 
          ref={menuRef}
          className="absolute left-0 top-14 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[200px]">
          {/* Agent selection */}
          {availableAgents.length > 0 && (
            <div className="border-b border-gray-200">
              <div className="px-3 py-2 text-xs font-medium text-gray-500">AGENTS</div>
              {availableAgents.map(agent => (
                <button
                  key={agent.id}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${selectedAgent === agent.id ? 'bg-blue-50' : ''}`}
                  onClick={(e) => handleAgentClick(e, agent.id)}
                >
                  <span className="text-sm">{agent.name}</span>
                  {selectedAgent === agent.id && <span className="text-blue-500">●</span>}
                </button>
              ))}
            </div>
          )}

          {/* Menu actions */}
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            onClick={handleSettingsClick}
          >
            <span>◐</span>
            <span className="text-sm">{t('menu.openSettings')}</span>
          </button>

          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            onClick={handleHideClick}
          >
            <span>○</span>
            <span className="text-sm">{t('menu.hideToolbar')}</span>
          </button>
        </div>
      )}
    </div>
  );
}