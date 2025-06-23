import React from 'react';

import { useApp } from '../context/AppContext';

export default function AgentSection() {
  const { settings, selectedAgent, selectAgent } = useApp();

  if (!settings) {
    return null;
  }

  const enabledAgents = settings.agents.filter(agent => agent.enabled);
  
  return (
    <section className="mb-8">
      <div className="hud-border-corner p-6">
        <h2 className="hud-subtitle mb-6">AI AGENT SELECTION</h2>
        
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
                {agent.hotkey || 'NO HOTKEY'}
              </div>
              {selectedAgent === agent.id && (
                <div className="mt-2 hud-label text-white/60">
                  ● ACTIVE AGENT
                </div>
              )}
            </button>
          ))}
        </div>
        
        {enabledAgents.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 text-white/30">◦</div>
            <p className="hud-text text-white/60">NO AGENTS CONFIGURED</p>
            <p className="hud-label text-white/40 mt-2">CREATE AGENTS TO BEGIN</p>
          </div>
        )}
      </div>
    </section>
  );
}