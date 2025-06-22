import React from 'react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'recording', label: '録音', icon: '🎤' },
  { id: 'mode-edit', label: 'モード編集', icon: '⚙️' },
  { id: 'history', label: '履歴', icon: '📋' },
  { id: 'settings', label: '設定', icon: '🔧' }
];

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white/5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600 bg-blue-50/10'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}