import React, { useState } from 'react';

import { useApp } from '../context/AppContext';
import { Agent } from '../types';
import { t } from '../utils/i18n';

export default function ModeEditScreen() {
  const { settings, updateSettings } = useApp();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!settings) {
    return <div className="p-6 text-white">{t('modeEdit.loadingSettings')}</div>;
  }

  const handleSaveAgent = (agent: Agent) => {
    const updatedAgents = editingAgent
      ? settings.agents.map(a => a.id === agent.id ? agent : a)
      : [...settings.agents, agent];
    
    updateSettings({ ...settings, agents: updatedAgents });
    setEditingAgent(null);
    setIsCreating(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm(t('modeEdit.deleteConfirm'))) {
      const updatedAgents = settings.agents.filter(a => a.id !== agentId);
      updateSettings({ ...settings, agents: updatedAgents });
    }
  };

  const handleCreateNew = () => {
    const newAgent: Agent = {
      id: `custom-${Date.now()}`,
      name: t('modeEdit.newAgentName'),
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">{t('modeEdit.agentEdit')}</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {t('modeEdit.createNew')}
        </button>
      </div>

      <div className="grid gap-4">
        {settings.agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white/10 rounded-lg p-4 border border-gray-600"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                <p className="text-sm text-gray-300">{agent.hotkey}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingAgent(agent)}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                >
                  {t('modeEdit.edit')}
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                >
                  {t('modeEdit.delete')}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              {t('modeEdit.modelLabel')} {agent.model} | {t('modeEdit.temperatureLabel')} {agent.temperature} | 
              {t('modeEdit.statusLabel')} {agent.enabled ? t('modeEdit.enabled') : t('modeEdit.disabled')} |
              {t('modeEdit.aiAutoProcessLabel')} {agent.autoProcessAi ? t('modeEdit.enabled') : t('modeEdit.disabled')}
            </p>
            <div className="flex items-center mb-2">
              <span className="text-sm text-gray-400 mr-2">{t('modeEdit.colorLabel')}</span>
              <div 
                className="w-4 h-4 rounded-full border border-gray-500"
                style={{ backgroundColor: agent.color }}
              />
            </div>
            <p className="text-sm text-gray-300 line-clamp-2">
              {agent.instruction}
            </p>
          </div>
        ))}
      </div>

      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          isCreating={isCreating}
          onSave={handleSaveAgent}
          onCancel={() => {
            setEditingAgent(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}

interface AgentEditModalProps {
  agent: Agent;
  isCreating: boolean;
  onSave: (agent: Agent) => void;
  onCancel: () => void;
}

function AgentEditModal({ agent, isCreating, onSave, onCancel }: AgentEditModalProps) {
  const [formData, setFormData] = useState<Agent>({ ...agent });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof Agent, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">
          {isCreating ? t('modeEdit.createAgent') : t('modeEdit.editAgent')}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              {t('modeEdit.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              {t('modeEdit.hotkey')}
            </label>
            <input
              type="text"
              value={formData.hotkey}
              onChange={(e) => handleChange('hotkey', e.target.value)}
              placeholder={t('modeEdit.hotkeyPlaceholder')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              {t('modeEdit.instruction')}
            </label>
            <textarea
              value={formData.instruction}
              onChange={(e) => handleChange('instruction', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                {t('modeEdit.model')}
              </label>
              <select
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4">{t('modeEdit.modelGpt4')}</option>
                <option value="gpt-4-vision-preview">{t('modeEdit.modelGpt4Vision')}</option>
                <option value="gpt-3.5-turbo">{t('modeEdit.modelGpt35Turbo')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                {t('modeEdit.temperature')} ({formData.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              {t('modeEdit.color')}
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
              />
              <div 
                className="w-6 h-6 rounded-full border border-gray-500"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-gray-300">{formData.color}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">{t('modeEdit.enable')}</span>
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.autoProcessAi}
                  onChange={(e) => handleChange('autoProcessAi', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-white">{t('modeEdit.autoProcessAi')}</span>
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {t('modeEdit.save')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t('modeEdit.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}