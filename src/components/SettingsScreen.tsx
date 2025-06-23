import React, { useState } from 'react';

import { useApp } from '../context/AppContext';
import { Agent } from '../types';
import { t } from '../utils/i18n';

import SettingsModal from './SettingsModal';

export default function SettingsScreen() {
  const { settings, selectedAgent, selectAgent, updateSettings } = useApp();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  if (!settings) {
    return (
      <div className="min-h-screen bg-black text-white hud-scanlines">
        <div className="hud-panel h-full hud-border-corner">
          <div className="hud-panel-header">
            <h2 className="hud-title">{t('settings.title')}</h2>
          </div>
          <div className="hud-panel-content">
            <div className="flex items-center gap-3">
              <div className="hud-animate-spin text-2xl text-white/70">◐</div>
              <span className="hud-text">{t('settings.loading')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const enabledAgents = settings.agents.filter(agent => agent.enabled);

  const handleSaveAgent = (agent: Agent) => {
    const updatedAgents = editingAgent
      ? settings.agents.map(a => a.id === agent.id ? agent : a)
      : [...settings.agents, agent];
    
    updateSettings({ ...settings, agents: updatedAgents });
    setEditingAgent(null);
    setIsCreating(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm(t('settings.deleteAgentConfirm'))) {
      const updatedAgents = settings.agents.filter(a => a.id !== agentId);
      updateSettings({ ...settings, agents: updatedAgents });
    }
  };

  const handleCreateNew = () => {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: t('settings.newAgentName'),
      hotkey: '',
      instruction: '',
      model: 'gpt-4',
      temperature: 0.7,
      enabled: true,
      autoProcessAi: true,
      color: '#6b7280'
    };
    setEditingAgent(newAgent);
    setIsCreating(true);
  };

  return (
    <div className="min-h-screen bg-black text-white hud-scanlines">
      <div className="hud-panel h-full hud-border-corner">
        {/* Header */}
        <div className="hud-panel-header">
          <h2 className="hud-title">{t('settings.agentManagement')}</h2>
        </div>
        
        <div className="hud-panel-content space-y-8">
          {/* Agent Management Section */}
          <div className="hud-border-corner p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="hud-subtitle">{t('settings.agentProtocols')}</h3>
              <button
                onClick={handleCreateNew}
                className="hud-btn hud-btn-primary"
              >
                {t('settings.createNewAgent')}
              </button>
            </div>
            
            {/* Current Agent Selection */}
            <div className="mb-6">
              <h4 className="hud-label mb-4">{t('settings.activeAgentSelection')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enabledAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`
                      relative hud-border-corner p-4 border transition-all duration-300 cursor-pointer
                      ${selectedAgent === agent.id 
                        ? 'border-white/60 bg-white/10' 
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/8'
                      }
                    `}
                  >
                    <button
                      onClick={() => selectAgent(agent.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="hud-text font-semibold">
                          {agent.name.toUpperCase()}
                        </div>
                        <div 
                          className="w-3 h-3 hud-status-dot idle"
                          style={{ backgroundColor: agent.color }}
                        />
                      </div>
                      <div className="hud-label text-white/60">
                        {agent.hotkey || t('settings.noHotkey')}
                      </div>
                      <div className="hud-label text-white/40 mt-1">
                        {t('settings.autoAiLabel')}: {agent.autoProcessAi ? t('settings.autoAiEnabled') : t('settings.autoAiDisabled')}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAgent(agent);
                        setIsCreating(false);
                      }}
                      className="absolute bottom-2 right-2 hud-btn text-xs"
                      title={t('settings.edit')}
                    >
                      {t('settings.edit')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div className="hud-border-corner p-6">
            <div className="flex justify-between items-center">
              <h3 className="hud-subtitle">{t('settings.coreSystemConfig')}</h3>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="hud-btn"
              >
                {t('settings.openConfiguration')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          isCreating={isCreating}
          onSave={handleSaveAgent}
          onDelete={handleDeleteAgent}
          onCancel={() => {
            setEditingAgent(null);
            setIsCreating(false);
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)} 
          embedded={false}
        />
      )}
    </div>
  );
}

interface AgentEditModalProps {
  agent: Agent;
  isCreating: boolean;
  onSave: (agent: Agent) => void;
  onDelete?: (agentId: string) => void;
  onCancel: () => void;
}

function AgentEditModal({ agent, isCreating, onSave, onDelete, onCancel }: AgentEditModalProps) {
  const [formData, setFormData] = useState<Agent>({ ...agent});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof Agent, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleDelete = () => {
    if (onDelete && confirm(t('agentEdit.deleteConfirm'))) {
      onDelete(agent.id);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 hud-scanlines">
      <div className="hud-panel w-full max-w-3xl max-h-[90vh] overflow-hidden hud-border-corner">
        {/* Header */}
        <div className="hud-panel-header">
          <div className="flex justify-between items-center">
            <h3 className="hud-title">
              {isCreating ? t('agentEdit.creationTitle') : t('agentEdit.modificationTitle')}
            </h3>
            <button
              onClick={onCancel}
              className="hud-btn text-white/60 hover:text-white"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
        
        <div className="hud-panel-content overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="hud-border-corner p-4">
              <div className="hud-subtitle mb-4">{t('agentEdit.identification')}</div>
              <div className="space-y-4">
                <div>
                  <label className="hud-label block mb-2">
                    {t('agentEdit.agentName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="hud-input"
                    required
                  />
                </div>

                <div>
                  <label className="hud-label block mb-2">
                    {t('agentEdit.hotkeySequence')}
                  </label>
                  <input
                    type="text"
                    value={formData.hotkey}
                    onChange={(e) => handleChange('hotkey', e.target.value)}
                    placeholder="CommandOrControl+Alt+1"
                    className="hud-input"
                  />
                </div>
              </div>
            </div>

            {/* AI Configuration */}
            <div className="hud-border-corner p-4">
              <div className="hud-subtitle mb-4">{t('agentEdit.aiParameters')}</div>
              <div className="space-y-4">
                <div>
                  <label className="hud-label block mb-2">
                    {t('agentEdit.instructionProtocol')}
                  </label>
                  <textarea
                    value={formData.instruction}
                    onChange={(e) => handleChange('instruction', e.target.value)}
                    rows={6}
                    className="hud-input min-h-[120px] resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="hud-label block mb-2">
                      {t('agentEdit.aiModel')}
                    </label>
                    <select
                      value={formData.model}
                      onChange={(e) => handleChange('model', e.target.value)}
                      className="hud-select"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-vision-preview">GPT-4 VISION</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 TURBO</option>
                    </select>
                  </div>

                  <div>
                    <label className="hud-label block mb-2">
                      {t('agentEdit.temperature')}: {formData.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Configuration */}
            <div className="hud-border-corner p-4">
              <div className="hud-subtitle mb-4">{t('agentEdit.visualParameters')}</div>
              <div>
                <label className="hud-label block mb-2">
                  {t('agentEdit.agentColor')}
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    className="w-12 h-8 border border-white/30 bg-black cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 hud-status-dot idle"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="hud-text">{formData.color.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="hud-border-corner p-4">
              <div className="hud-subtitle mb-4">{t('agentEdit.systemSettings')}</div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => handleChange('enabled', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                      formData.enabled ? 'bg-white/20 border-white/60' : 'bg-black/50'
                    }`}>
                      {formData.enabled && (
                        <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                      )}
                    </div>
                  </div>
                  <span className="hud-text">{t('agentEdit.enableAgent')}</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.autoProcessAi}
                      onChange={(e) => handleChange('autoProcessAi', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                      formData.autoProcessAi ? 'bg-white/20 border-white/60' : 'bg-black/50'
                    }`}>
                      {formData.autoProcessAi && (
                        <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                      )}
                    </div>
                  </div>
                  <span className="hud-text">{t('agentEdit.autoProcessAi')}</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 p-6 bg-white/5">
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              className="hud-btn hud-btn-primary flex-1"
            >
              {t('agentEdit.saveAgent')}
            </button>
            {!isCreating && onDelete && (
              <button
                onClick={handleDelete}
                className="hud-btn hud-btn-danger"
              >
                {t('agentEdit.deleteAgent')}
              </button>
            )}
            <button
              onClick={onCancel}
              className="hud-btn flex-1"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}