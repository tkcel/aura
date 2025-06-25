import React, { useState, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { t } from '../utils/i18n';
import RestartConfirmModal from './RestartConfirmModal';
import BufferReductionConfirmModal from './BufferReductionConfirmModal';

interface SettingsModalProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function SettingsModal({ onClose, embedded = false }: SettingsModalProps) {
  const { settings, updateSettings, testApiConnection, language, changeLanguage } = useApp();
  
  const [formData, setFormData] = useState({
    openaiApiKey: '',
    language: 'auto' as 'ja' | 'en' | 'auto',
    uiLanguage: 'en' as 'ja' | 'en',
    autoStartup: false,
    systemTray: true,
    soundNotifications: true,
    saveAudioFiles: false,
    maxHistoryEntries: 100,
    autoPaste: true,
  });

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<'success' | 'failure' | null>(null);
  const [activeSection, setActiveSection] = useState<'api' | 'voice' | 'system' | 'history'>('api');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showBufferReductionConfirm, setShowBufferReductionConfirm] = useState(false);
  const [pendingMaxHistoryEntries, setPendingMaxHistoryEntries] = useState<number | null>(null);
  const [deleteCount, setDeleteCount] = useState(0);

  useEffect(() => {
    if (settings) {
      setFormData({
        openaiApiKey: settings.openaiApiKey || '',
        language: settings.language || 'auto',
        uiLanguage: settings.uiLanguage || 'en',
        autoStartup: settings.autoStartup || false,
        systemTray: settings.systemTray !== undefined ? settings.systemTray : true,
        soundNotifications: settings.soundNotifications !== undefined ? settings.soundNotifications : true,
        saveAudioFiles: settings.saveAudioFiles || false,
        maxHistoryEntries: settings.maxHistoryEntries || 100,
        autoPaste: settings.autoPaste !== undefined ? settings.autoPaste : true,
      });
    }
  }, [settings]);

  // Show loading state while settings are being loaded
  if (!settings) {
    const loadingContent = (
      <div className="hud-panel hud-border-corner p-8">
        <div className="flex items-center gap-3">
          <div className="hud-animate-spin text-2xl text-white/70">◐</div>
          <span className="hud-text">{t('settingsModal.loading')}</span>
        </div>
      </div>
    );
    
    return embedded ? loadingContent : (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 hud-scanlines">
        {loadingContent}
      </div>
    );
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // UI言語の場合は即座に反映
    if (field === 'uiLanguage') {
      changeLanguage(value as 'ja' | 'en');
    }
    
    // 埋め込みモードでは自動保存（ただし、maxHistoryEntriesの削減チェックを行う）
    if (embedded && field === 'maxHistoryEntries' && typeof value === 'number') {
      window.electronAPI.checkHistoryBufferReduction(value).then(result => {
        if (result.wouldDelete && result.deleteCount) {
          setPendingMaxHistoryEntries(value);
          setDeleteCount(result.deleteCount);
          setShowBufferReductionConfirm(true);
        } else {
          updateSettings({ [field]: value }).catch(_error => {
            // Error handling removed for production
          });
        }
      });
    } else if (embedded) {
      updateSettings({ [field]: value }).catch(_error => {
        // Error handling removed for production
      });
    }
  };

  const handleSave = async () => {
    try {
      // Check if reducing maxHistoryEntries would delete entries
      const currentSettings = settings || {};
      const currentMaxEntries = currentSettings.maxHistoryEntries || 100;
      
      if (formData.maxHistoryEntries < currentMaxEntries) {
        const result = await window.electronAPI.checkHistoryBufferReduction(formData.maxHistoryEntries);
        if (result.wouldDelete && result.deleteCount) {
          setPendingMaxHistoryEntries(formData.maxHistoryEntries);
          setDeleteCount(result.deleteCount);
          setShowBufferReductionConfirm(true);
          return;
        }
      }
      
      setShowRestartConfirm(true);
    } catch (error) {
      // Error handling removed for production
    }
  };

  const handleRestartConfirm = async () => {
    try {
      await updateSettings(formData);
      // Restart the app
      if (window.electronAPI) {
        await window.electronAPI.restartApp();
      }
    } catch (error) {
      // Error handling removed for production
      setShowRestartConfirm(false);
    }
  };

  const handleRestartCancel = () => {
    setShowRestartConfirm(false);
  };
  
  const handleBufferReductionConfirm = () => {
    setShowBufferReductionConfirm(false);
    setPendingMaxHistoryEntries(null);
    
    // 埋め込みモードの場合は設定を保存
    if (embedded && pendingMaxHistoryEntries !== null) {
      updateSettings({ maxHistoryEntries: pendingMaxHistoryEntries }).catch(_error => {
        // Error handling removed for production
      });
    } else {
      // 通常モードの場合は再起動確認ダイアログを表示
      setShowRestartConfirm(true);
    }
  };
  
  const handleBufferReductionCancel = () => {
    setShowBufferReductionConfirm(false);
    setPendingMaxHistoryEntries(null);
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    
    try {
      // Temporarily update settings to test with new API key
      await updateSettings({ openaiApiKey: formData.openaiApiKey });
      const result = await testApiConnection();
      setApiTestResult(result ? 'success' : 'failure');
    } catch (error) {
      setApiTestResult('failure');
    } finally {
      setIsTestingApi(false);
    }
  };

  const sections = [
    { id: 'api', label: t('settingsModal.apiConfig'), icon: '◦' },
    { id: 'voice', label: t('settingsModal.audioSys'), icon: '◦' },
    { id: 'system', label: t('settingsModal.coreSys'), icon: '◦' },
    { id: 'history', label: t('settingsModal.dataArch'), icon: '◦' }
  ] as const;

  const renderApiSection = () => (
    <div className="space-y-6">
      <div className="hud-border-corner p-4">
        <div className="hud-subtitle mb-4">{t('settingsModal.openaiAuth')}</div>
        <div className="space-y-4">
          <div>
            <label className="hud-label block mb-2">
              {t('settingsModal.apiKey')}
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                value={formData.openaiApiKey}
                onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
                placeholder="sk-proj-..."
                className="hud-input flex-1"
              />
              <button
                onClick={handleTestApi}
                disabled={isTestingApi || !formData.openaiApiKey}
                className={`hud-btn ${
                  apiTestResult === 'success' 
                    ? 'hud-btn-primary' 
                    : apiTestResult === 'failure'
                    ? 'hud-btn-danger'
                    : ''
                }`}
              >
                {isTestingApi ? t('settingsModal.testing') : 
                 apiTestResult === 'success' ? t('settingsModal.verified') :
                 apiTestResult === 'failure' ? t('settingsModal.failed') :
                 t('settingsModal.verify')}
              </button>
            </div>
            {apiTestResult && (
              <div className={`hud-text mt-2 ${
                apiTestResult === 'success' ? 'text-white/80' : 'text-white/60'
              }`}>
                {apiTestResult === 'success' 
                  ? `● ${t('settingsModal.connectionEstablished')}` 
                  : `● ${t('settingsModal.connectionFailed')}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoiceSection = () => (
    <div className="space-y-6">
      <div className="hud-border-corner p-4">
        <div className="hud-subtitle mb-4">{t('settingsModal.voiceRecognition')}</div>
        <div className="space-y-4">
          <div>
            <label className="hud-label block mb-2">
              {t('settingsModal.languageProtocol')}
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="hud-select"
            >
              <option value="auto">{t('settingsModal.autoDetect')}</option>
              <option value="en">{t('settingsModal.english')}</option>
              <option value="ja">{t('settingsModal.japanese')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSection = () => (
    <div className="space-y-6">
      <div className="hud-border-corner p-4">
        <div className="hud-subtitle mb-4">{t('settingsModal.systemParameters')}</div>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.autoStartup}
                onChange={(e) => handleInputChange('autoStartup', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                formData.autoStartup ? 'bg-white/20 border-white/60' : 'bg-black/50'
              }`}>
                {formData.autoStartup && (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                )}
              </div>
            </div>
            <span className="hud-text">{t('settingsModal.autoStartup')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.systemTray}
                onChange={(e) => handleInputChange('systemTray', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                formData.systemTray ? 'bg-white/20 border-white/60' : 'bg-black/50'
              }`}>
                {formData.systemTray && (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                )}
              </div>
            </div>
            <span className="hud-text">{t('settingsModal.systemTray')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.soundNotifications}
                onChange={(e) => handleInputChange('soundNotifications', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                formData.soundNotifications ? 'bg-white/20 border-white/60' : 'bg-black/50'
              }`}>
                {formData.soundNotifications && (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                )}
              </div>
            </div>
            <span className="hud-text">{t('settingsModal.audioNotifications')}</span>
          </label>
        </div>
      </div>

      <div className="hud-border-corner p-4">
        <div className="hud-subtitle mb-4">{t('settingsModal.uiLanguage')}</div>
        <div className="space-y-3">
          <select
            value={formData.uiLanguage}
            onChange={(e) => handleInputChange('uiLanguage', e.target.value)}
            className="w-full bg-black/50 border border-white/30 hud-text px-3 py-2 focus:border-white/60 transition-colors"
          >
            <option value="en">{t('settingsModal.english')}</option>
            <option value="ja">{t('settingsModal.japanese')}</option>
          </select>
          <div className="hud-label text-white/50 text-xs">
            {t('settingsModal.uiLanguageDesc')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistorySection = () => (
    <div className="space-y-6">
      <div className="hud-border-corner p-4">
        <div className="hud-subtitle mb-4">{t('settingsModal.dataArchival')}</div>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.saveAudioFiles}
                onChange={(e) => handleInputChange('saveAudioFiles', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                formData.saveAudioFiles ? 'bg-white/20 border-white/60' : 'bg-black/50'
              }`}>
                {formData.saveAudioFiles && (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                )}
              </div>
            </div>
            <span className="hud-text">{t('settingsModal.audioFilePreservation')}</span>
          </label>
          {formData.saveAudioFiles && (
            <div className="hud-text text-white/50 ml-7 text-xs">
              → {t('settingsModal.storedIn')}
            </div>
          )}

          <div>
            <label className="hud-label block mb-2">
              {t('settingsModal.historyBufferSize')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                max="1000"
                value={formData.maxHistoryEntries}
                onChange={(e) => handleInputChange('maxHistoryEntries', parseInt(e.target.value) || 100)}
                className="hud-input w-24"
              />
              <span className="hud-text">{t('settingsModal.entriesMax')}</span>
            </div>
            <div className="hud-text text-white/50 mt-1 text-xs">
              → {t('settingsModal.autoPurge')}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.autoPaste}
                onChange={(e) => handleInputChange('autoPaste', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 border border-white/30 transition-all duration-300 ${
                formData.autoPaste ? 'bg-white/20 border-white/60' : 'bg-black/50'
              }`}>
                {formData.autoPaste && (
                  <div className="w-full h-full flex items-center justify-center text-white/90 text-xs">●</div>
                )}
              </div>
            </div>
            <span className="hud-text">{t('settingsModal.autoPaste')}</span>
          </label>
          <div className="hud-text text-white/50 ml-7 text-xs">
            → {t('settingsModal.autoPasteDesc')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'api': return renderApiSection();
      case 'voice': return renderVoiceSection();
      case 'system': return renderSystemSection();
      case 'history': return renderHistorySection();
      default: return renderApiSection();
    }
  };

  const content = (
    <div className={embedded ? "w-full" : "hud-panel w-full max-w-4xl max-h-[90vh] overflow-hidden hud-border-corner"}>
      {/* Header */}
      {!embedded && (
        <div className="hud-panel-header">
          <div className="flex justify-between items-center">
            <h2 className="hud-title">{t('settingsModal.title')}</h2>
            <button
              onClick={onClose}
              className="hud-btn text-white/60 hover:text-white"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* Navigation */}
        <div className="w-64 border-r border-white/20 hud-panel-content">
          <div className="hud-subtitle mb-6">{t('settingsModal.modules')}</div>
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left p-3 hud-text transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-white/10 border-l-2 border-white/60 text-white'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{section.icon}</span>
                  <span className="hud-label">{section.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 hud-panel-content overflow-y-auto">
          <div className="max-w-2xl">
            {renderSectionContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
      {!embedded && (
        <div className="border-t border-white/20 p-6 bg-white/5">
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleSave}
              className="hud-btn hud-btn-primary"
            >
              {t('settingsModal.saveConfig')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 hud-scanlines">
      {content}
      <RestartConfirmModal
        isOpen={showRestartConfirm}
        onConfirm={handleRestartConfirm}
        onCancel={handleRestartCancel}
      />
      <BufferReductionConfirmModal
        isOpen={showBufferReductionConfirm}
        deleteCount={deleteCount}
        onConfirm={handleBufferReductionConfirm}
        onCancel={handleBufferReductionCancel}
      />
    </div>
  );
}