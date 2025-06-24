import React from 'react';

import { useApp } from '../context/AppContext';
import { t } from '../utils/i18n';

export default function AgentSection() {
  const { settings, selectedAgent, selectAgent } = useApp();

  if (!settings) {
    return null;
  }

  const enabledAgents = settings.agents.filter(agent => agent.enabled);
  const disabledAgents = settings.agents.filter(agent => !agent.enabled);
  
  return (
    <section className="mb-8">
      <div className="hud-border-corner p-6">
        <h2 className="hud-subtitle mb-6">{t('agents.title')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={`
                hud-border-corner p-4 text-left transition-all duration-300 border
                ${selectedAgent === agent.id 
                  ? 'border-white/60 bg-white/10' 
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8'
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="hud-text font-semibold">
                  {agent.name.toUpperCase()}
                </div>
                <div 
                  className="w-3 h-3 hud-status-dot idle"
                  style={{ backgroundColor: agent.color }}
                />
              </div>
              <div className="hud-label bg-white/10 px-2 py-1 inline-block">
                {agent.hotkey || t('agents.noHotkey')}
              </div>
              {selectedAgent === agent.id && (
                <div className="mt-2 hud-label text-white/60">
                  ● {t('agents.activeAgent')}
                </div>
              )}
            </button>
          ))}
          
          {disabledAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={`
                hud-border-corner p-4 text-left transition-all duration-300 border opacity-50
                ${selectedAgent === agent.id 
                  ? 'border-white/30 bg-white/5' 
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="hud-text font-semibold">
                  {agent.name.toUpperCase()}
                </div>
                <div 
                  className="w-3 h-3 hud-status-dot"
                  style={{ backgroundColor: agent.color, opacity: 0.5 }}
                />
              </div>
              <div className="hud-label bg-white/5 px-2 py-1 inline-block">
                {agent.hotkey || t('agents.noHotkey')}
              </div>
              <div className="mt-2 hud-label text-white/40">
                ◦ {t('agents.disabled')}
              </div>
              {selectedAgent === agent.id && (
                <div className="mt-1 hud-label text-white/60">
                  ● {t('agents.activeAgent')}
                </div>
              )}
            </button>
          ))}
        </div>
        
        {enabledAgents.length === 0 && disabledAgents.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 text-white/30">◦</div>
            <p className="hud-text text-white/60">{t('agents.noAgents')}</p>
            <p className="hud-label text-white/40 mt-2">{t('agents.createAgents')}</p>
          </div>
        )}
      </div>
    </section>
  );
}