import React from 'react';
import { useApp } from '../context/AppContext';

export default function AgentSection() {
  const { settings, selectedAgent, selectAgent } = useApp();

  if (!settings) {
    console.log('AgentSection: No settings available');
    return null;
  }

  const enabledAgents = settings.agents.filter(agent => agent.enabled);
  
  console.log('AgentSection render:', {
    settingsExists: !!settings,
    enabledAgentsCount: enabledAgents.length,
    selectedAgent,
    firstAgent: enabledAgents[0]?.name
  });

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        🤖 AIエージェント
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enabledAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => selectAgent(agent.id)}
            className={`
              card p-6 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl
              ${selectedAgent === agent.id 
                ? 'bg-gradient-primary text-white ring-2 ring-primary-300' 
                : 'hover:bg-white'
              }
            `}
          >
            <div className={`font-semibold mb-2 ${
              selectedAgent === agent.id ? 'text-white' : 'text-gray-800'
            }`}>
              {agent.name}
            </div>
            <div className={`text-sm px-2 py-1 rounded inline-block ${
              selectedAgent === agent.id 
                ? 'bg-white/20 text-white/90' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {agent.hotkey}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}