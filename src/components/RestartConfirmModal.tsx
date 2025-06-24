import React from 'react';
import { t } from '../utils/i18n';

interface RestartConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestartConfirmModal({ isOpen, onConfirm, onCancel }: RestartConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="hud-panel hud-border-corner p-6 max-w-md">
        <div className="hud-title mb-4">設定の反映</div>
        <div className="hud-text mb-6">
          設定を反映させるためにはアプリの再起動が必要です。よろしいですか？
        </div>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="hud-btn"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="hud-btn hud-btn-primary"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}