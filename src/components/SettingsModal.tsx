import React, { useState, useEffect } from 'react';

import { useApp } from '../context/AppContext';

interface SettingsModalProps {
  onClose: () => void;
  embedded?: boolean;
}

export default function SettingsModal({ onClose, embedded = false }: SettingsModalProps) {
  const { settings, updateSettings, testApiConnection } = useApp();
  
  const [formData, setFormData] = useState({
    openaiApiKey: '',
    language: 'auto' as 'ja' | 'en' | 'auto',
    autoStartup: false,
    systemTray: true,
    soundNotifications: true,
    saveAudioFiles: false,
    maxHistoryEntries: 100,
  });

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        openaiApiKey: settings.openaiApiKey || '',
        language: settings.language || 'auto',
        autoStartup: settings.autoStartup || false,
        systemTray: settings.systemTray !== undefined ? settings.systemTray : true,
        soundNotifications: settings.soundNotifications !== undefined ? settings.soundNotifications : true,
        saveAudioFiles: settings.saveAudioFiles || false,
        maxHistoryEntries: settings.maxHistoryEntries || 100,
      });
    }
  }, [settings]);

  // Show loading state while settings are being loaded
  if (!settings) {
    const loadingContent = (
      <div className="bg-white rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span className="text-gray-700">設定を読み込み中...</span>
        </div>
      </div>
    );
    
    return embedded ? loadingContent : (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        {loadingContent}
      </div>
    );
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
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

  const content = (
    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            ⚙️ 設定
          </h2>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* API Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🔑 API設定
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.openaiApiKey}
                    onChange={(e) => handleInputChange('openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="form-input flex-1"
                  />
                  <button
                    onClick={handleTestApi}
                    disabled={isTestingApi || !formData.openaiApiKey}
                    className={`btn btn-small ${
                      apiTestResult === 'success' 
                        ? 'bg-green-500 text-white' 
                        : apiTestResult === 'failure'
                        ? 'bg-red-500 text-white'
                        : 'btn-secondary'
                    }`}
                  >
                    {isTestingApi ? '🔄 テスト中...' : 
                     apiTestResult === 'success' ? '✅ 成功' :
                     apiTestResult === 'failure' ? '❌ 失敗' :
                     '🔄 接続テスト'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🗣️ 音声設定
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  言語:
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="form-select"
                >
                  <option value="auto">自動検出</option>
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
              
            </div>
          </div>

          {/* System Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🎛️ システム設定
            </h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.autoStartup}
                  onChange={(e) => handleInputChange('autoStartup', e.target.checked)}
                  className="mr-3 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">PC起動時に自動起動</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.systemTray}
                  onChange={(e) => handleInputChange('systemTray', e.target.checked)}
                  className="mr-3 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">システムトレイに常駐</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.soundNotifications}
                  onChange={(e) => handleInputChange('soundNotifications', e.target.checked)}
                  className="mr-3 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">音声通知を有効化</span>
              </label>
            </div>
          </div>

          {/* History Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              📚 履歴設定
            </h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.saveAudioFiles}
                  onChange={(e) => handleInputChange('saveAudioFiles', e.target.checked)}
                  className="mr-3 w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">音声ファイルを保存する</span>
              </label>
              <div className="text-xs text-gray-500 ml-7">
                有効にすると、録音した音声ファイルが ~/.aura/recordings に保存されます
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  履歴保存件数:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={formData.maxHistoryEntries}
                    onChange={(e) => handleInputChange('maxHistoryEntries', parseInt(e.target.value) || 100)}
                    className="form-input w-24"
                  />
                  <span className="text-sm text-gray-600">件まで保存</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  指定した件数を超えると、古い履歴から自動削除されます
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 justify-end p-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="btn btn-primary"
          >
            💾 保存
          </button>
        </div>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      {content}
    </div>
  );
}