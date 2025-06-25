import React from 'react';
import { t } from '../utils/i18n';

interface BufferReductionConfirmModalProps {
  isOpen: boolean;
  deleteCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function BufferReductionConfirmModal({ 
  isOpen, 
  deleteCount, 
  onConfirm, 
  onCancel 
}: BufferReductionConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="hud-panel hud-border-corner p-6 max-w-md">
        <div className="hud-title mb-4">{t('settingsModal.bufferReduction.title')}</div>
        <div className="hud-text mb-6">
          {t('settingsModal.bufferReduction.message', { count: deleteCount })}
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
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}