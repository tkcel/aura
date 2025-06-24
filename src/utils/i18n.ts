/**
 * Simple internationalization system
 */

export type Language = "en" | "ja";

export interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Common
    "common.ok": "OK",
    "common.cancel": "CANCEL",
    "common.close": "CLOSE",
    "common.delete": "DELETE",
    "common.copy": "COPY",
    "common.save": "SAVE",
    "common.edit": "EDIT",
    "common.search": "SEARCH",
    "common.loading": "LOADING",
    "common.error": "ERROR",
    "common.ready": "READY",
    "common.processing": "PROCESSING",

    // Recording
    "recording.start": "START RECORDING",
    "recording.stop": "STOP RECORDING",
    "recording.pause": "PAUSE",
    "recording.resume": "RESUME",
    "recording.listening": "LISTENING...",
    "recording.analyzing": "ANALYZING VOICE INPUT...",

    // Results
    "results.title": "PROCESSING RESULTS",
    "results.voiceTab": "VOICE RECOGNITION",
    "results.aiTab": "AI PROCESSING",
    "results.sttOutput": "SPEECH-TO-TEXT OUTPUT",
    "results.aiOutput": "ARTIFICIAL INTELLIGENCE OUTPUT",
    "results.copyData": "COPY DATA",
    "results.terminate": "TERMINATE",
    "results.closeTerminal": "CLOSE TERMINAL",
    "results.awaitingVoice": "AWAITING VOICE INPUT...",
    "results.awaitingAi": "AWAITING AI PROCESSING...",
    "results.neuralProcessing": "NEURAL NETWORK PROCESSING...",
    "results.language": "LANGUAGE",
    "results.confidence": "CONFIDENCE",
    "results.agent": "AGENT",
    "results.model": "MODEL",
    "results.tokens": "TOKENS",
    "results.completion": "COMPLETION",
    "results.timestamp": "TIMESTAMP",
    "results.status": "STATUS",

    // History
    "history.title": "DATA ARCHIVE",
    "history.systemTitle": "DATA ARCHIVE",
    "history.entries": "ENTRIES",
    "history.expand": "EXPAND ARCHIVE",
    "history.collapse": "COLLAPSE",
    "history.purgeAll": "PURGE ALL",
    "history.noData": "NO DATA ARCHIVED",
    "history.beginRecording": "BEGIN RECORDING TO POPULATE ARCHIVE",
    "history.searchPlaceholder": "SEARCH ARCHIVE...",
    "history.allAgents": "ALL AGENTS",
    "history.noMatching": "NO MATCHING RECORDS",
    "history.play": "PLAY",
    "history.copyResponse": "COPY RESPONSE",
    "history.deleteEntry": "DELETE ENTRY",
    "history.voiceInput": "VOICE INPUT:",
    "history.aiResponse": "AI RESPONSE:",
    "history.statistics": "ARCHIVE STATISTICS",
    "history.totalEntries": "TOTAL ENTRIES",
    "history.withAudio": "WITH AUDIO",
    "history.latest": "LATEST",
    "history.avgDuration": "AVG DURATION",

    // Settings
    "settings.title": "SYSTEM CONFIGURATION",
    "settings.agents": "AI AGENTS",
    "settings.api": "API SETTINGS",
    "settings.audio": "AUDIO SETTINGS",
    "settings.language": "LANGUAGE",
    "settings.theme": "THEME",
    "settings.loading": "LOADING CONFIGURATION DATA...",
    "settings.agentManagement": "AGENT MANAGEMENT SYSTEM",
    "settings.agentProtocols": "AGENT PROTOCOLS",
    "settings.createNewAgent": "CREATE NEW AGENT",
    "settings.activeAgentSelection": "ACTIVE AGENT SELECTION",
    "settings.noHotkey": "NO HOTKEY",
    "settings.autoAiEnabled": "ENABLED",
    "settings.autoAiDisabled": "DISABLED",
    "settings.autoAiLabel": "AUTO-AI",
    "settings.edit": "EDIT",
    "settings.coreSystemConfig": "CORE SYSTEM CONFIG",
    "settings.openConfiguration": "OPEN CONFIGURATION",
    "settings.deleteAgentConfirm": "DELETE THIS AGENT?",
    "settings.newAgentName": "NEW AGENT",

    // Agent Edit Modal
    "agentEdit.creationTitle": "AGENT CREATION PROTOCOL",
    "agentEdit.modificationTitle": "AGENT MODIFICATION PROTOCOL",
    "agentEdit.identification": "AGENT IDENTIFICATION",
    "agentEdit.agentName": "AGENT NAME:",
    "agentEdit.hotkeySequence": "HOTKEY SEQUENCE:",
    "agentEdit.aiParameters": "AI NEURAL PARAMETERS",
    "agentEdit.instructionProtocol": "INSTRUCTION PROTOCOL:",
    "agentEdit.aiModel": "AI MODEL:",
    "agentEdit.temperature": "TEMPERATURE",
    "agentEdit.visualParameters": "VISUAL PARAMETERS",
    "agentEdit.agentColor": "AGENT COLOR:",
    "agentEdit.systemSettings": "SYSTEM SETTINGS",
    "agentEdit.enableAgent": "ENABLE AGENT",
    "agentEdit.autoProcessAi": "AUTO-PROCESS WITH AI",
    "agentEdit.saveAgent": "SAVE AGENT",
    "agentEdit.deleteAgent": "DELETE",
    "agentEdit.deleteConfirm": "DELETE THIS AGENT PERMANENTLY?",

    // Settings Modal
    "settingsModal.title": "SYSTEM CONFIGURATION",
    "settingsModal.loading": "LOADING CONFIGURATION...",
    "settingsModal.modules": "MODULES",
    "settingsModal.apiConfig": "API CONFIG",
    "settingsModal.audioSys": "AUDIO SYS",
    "settingsModal.coreSys": "CORE SYS",
    "settingsModal.dataArch": "DATA ARCH",
    "settingsModal.openaiAuth": "OPENAI AUTHENTICATION",
    "settingsModal.apiKey": "API ACCESS KEY:",
    "settingsModal.testing": "TESTING...",
    "settingsModal.verified": "VERIFIED",
    "settingsModal.failed": "FAILED",
    "settingsModal.verify": "VERIFY",
    "settingsModal.connectionEstablished": "CONNECTION ESTABLISHED",
    "settingsModal.connectionFailed": "CONNECTION FAILED - VERIFY KEY",
    "settingsModal.voiceRecognition": "VOICE RECOGNITION",
    "settingsModal.languageProtocol": "LANGUAGE PROTOCOL:",
    "settingsModal.autoDetect": "AUTO-DETECT",
    "settingsModal.english": "ENGLISH",
    "settingsModal.japanese": "JAPANESE",
    "settingsModal.systemParameters": "SYSTEM PARAMETERS",
    "settingsModal.autoStartup": "AUTO-STARTUP PROTOCOL",
    "settingsModal.systemTray": "SYSTEM TRAY DAEMON",
    "settingsModal.audioNotifications": "AUDIO NOTIFICATIONS",
    "settingsModal.dataArchival": "DATA ARCHIVAL",
    "settingsModal.audioFilePreservation": "AUDIO FILE PRESERVATION",
    "settingsModal.storedIn": "STORED IN ~/.aura/recordings",
    "settingsModal.historyBufferSize": "HISTORY BUFFER SIZE:",
    "settingsModal.entriesMax": "ENTRIES MAX",
    "settingsModal.autoPurge": "AUTO-PURGE WHEN LIMIT EXCEEDED",
    "settingsModal.saveConfig": "SAVE CONFIG",
    "settingsModal.uiLanguage": "UI LANGUAGE",
    "settingsModal.uiLanguageDesc": "Language for user interface display",

    // Tab Navigation
    "tab.history": "HISTORY",
    "tab.settings": "SETTINGS",

    // Additional missing translations
    "history.copyStt": "COPY STT",
    "history.copyAi": "COPY AI",
    "history.copyAll": "COPY ALL",
    "history.audioArchived": "AUDIO ARCHIVED",
    "history.playAudio": "PLAY AUDIO",
    "history.copyTranscription": "COPY TRANSCRIPTION",
    "history.copyAiResponse": "COPY AI RESPONSE",
    "history.copyAllContent": "COPY ALL CONTENT",

    // Results additional
    "results.copyAll": "COPY ALL",
    "results.copyAllContent": "COPY ALL CONTENT",

    // Agents
    "agents.title": "AI AGENT SELECTION",
    "agents.noAgents": "NO AGENTS CONFIGURED",
    "agents.createAgents": "CREATE AGENTS TO BEGIN",
    "agents.activeAgent": "ACTIVE AGENT",
    "agents.noHotkey": "NO HOTKEY",

    // Recording screen
    "recording.voiceRecording": "VOICE RECORDING",
    "recording.autoAiProcessing": "AUTO AI PROCESSING",
    "recording.enabled": "ENABLED",
    "recording.disabled": "DISABLED",
    "recording.processWithAi": "PROCESS WITH AI",
    "recording.copyTranscription": "COPY TRANSCRIPTION",
    "recording.skip": "SKIP",
    "recording.speechRecognitionResult": "SPEECH RECOGNITION RESULT",

    // Processing
    "processing.analyzingVoice": "ANALYZING VOICE INPUT...",
    "processing.neuralProcessing": "NEURAL NETWORK PROCESSING...",

    // ModeEditScreen (Agent Management)
    "modeEdit.loadingSettings": "LOADING SETTINGS...",
    "modeEdit.deleteConfirm": "DELETE THIS AGENT?",
    "modeEdit.agentEdit": "AGENT EDIT",
    "modeEdit.createAgent": "CREATE AGENT",
    "modeEdit.editAgent": "EDIT AGENT",
    "modeEdit.createNew": "+ CREATE NEW",
    "modeEdit.edit": "EDIT",
    "modeEdit.delete": "DELETE",
    "modeEdit.save": "SAVE",
    "modeEdit.cancel": "CANCEL",
    "modeEdit.name": "NAME",
    "modeEdit.hotkey": "HOTKEY",
    "modeEdit.instruction": "INSTRUCTION",
    "modeEdit.model": "MODEL",
    "modeEdit.temperature": "TEMPERATURE",
    "modeEdit.color": "COLOR",
    "modeEdit.enable": "ENABLE",
    "modeEdit.autoProcessAi": "AUTO-PROCESS AI AFTER VOICE RECOGNITION",
    "modeEdit.modelLabel": "MODEL:",
    "modeEdit.temperatureLabel": "TEMPERATURE:",
    "modeEdit.statusLabel": "STATUS:",
    "modeEdit.enabled": "ENABLED",
    "modeEdit.disabled": "DISABLED",
    "modeEdit.aiAutoProcessLabel": "AI AUTO-PROCESS:",
    "modeEdit.colorLabel": "COLOR:",
    "modeEdit.hotkeyPlaceholder": "e.g. CommandOrControl+Alt+1",
    "modeEdit.newAgentName": "NEW AGENT",
    "modeEdit.modelGpt4": "GPT-4",
    "modeEdit.modelGpt4Vision": "GPT-4 Vision",
    "modeEdit.modelGpt35Turbo": "GPT-3.5 Turbo",

    // Menu
    "menu.openSettings": "OPEN SETTINGS",
    "menu.showToolbar": "SHOW TOOLBAR",
    "menu.hideToolbar": "HIDE TOOLBAR",
    "menu.exit": "EXIT",
  },
  ja: {
    // Common
    "common.ok": "OK",
    "common.cancel": "キャンセル",
    "common.close": "閉じる",
    "common.delete": "削除",
    "common.copy": "コピー",
    "common.save": "保存",
    "common.edit": "編集",
    "common.search": "検索",
    "common.loading": "読み込み中",
    "common.error": "エラー",
    "common.ready": "準備完了",
    "common.processing": "処理中",

    // Recording
    "recording.start": "録音開始",
    "recording.stop": "録音停止",
    "recording.pause": "一時停止",
    "recording.resume": "再開",
    "recording.listening": "音声を聞いています...",
    "recording.analyzing": "音声を解析中...",

    // Results
    "results.title": "処理結果",
    "results.voiceTab": "音声認識",
    "results.aiTab": "AI処理",
    "results.sttOutput": "音声テキスト変換結果",
    "results.aiOutput": "AI処理結果",
    "results.copyData": "データをコピー",
    "results.terminate": "終了",
    "results.closeTerminal": "ターミナルを閉じる",
    "results.awaitingVoice": "音声入力を待機中...",
    "results.awaitingAi": "AI処理を待機中...",
    "results.neuralProcessing": "ニューラルネットワーク処理中...",
    "results.language": "言語",
    "results.confidence": "信頼度",
    "results.agent": "エージェント",
    "results.model": "モデル",
    "results.tokens": "トークン",
    "results.completion": "完了時刻",
    "results.timestamp": "タイムスタンプ",
    "results.status": "ステータス",

    // History
    "history.title": "データアーカイブ",
    "history.systemTitle": "データアーカイブ",
    "history.entries": "件",
    "history.expand": "アーカイブを展開",
    "history.collapse": "折りたたむ",
    "history.purgeAll": "すべて削除",
    "history.noData": "アーカイブされたデータはありません",
    "history.beginRecording": "録音を開始してアーカイブに追加してください",
    "history.searchPlaceholder": "アーカイブを検索...",
    "history.allAgents": "すべてのエージェント",
    "history.noMatching": "一致するレコードがありません",
    "history.play": "再生",
    "history.copyResponse": "応答をコピー",
    "history.deleteEntry": "エントリを削除",
    "history.voiceInput": "音声入力:",
    "history.aiResponse": "AI応答:",
    "history.statistics": "アーカイブ統計",
    "history.totalEntries": "総エントリ数",
    "history.withAudio": "音声付き",
    "history.latest": "最新",
    "history.avgDuration": "平均時間",

    // Settings
    "settings.title": "システム設定",
    "settings.agents": "AIエージェント",
    "settings.api": "API設定",
    "settings.audio": "音声設定",
    "settings.language": "言語",
    "settings.theme": "テーマ",
    "settings.loading": "設定データを読み込み中...",
    "settings.agentManagement": "エージェント管理システム",
    "settings.agentProtocols": "エージェントプロトコル",
    "settings.createNewAgent": "新しいエージェントを作成",
    "settings.activeAgentSelection": "アクティブエージェント選択",
    "settings.noHotkey": "ホットキーなし",
    "settings.autoAiEnabled": "有効",
    "settings.autoAiDisabled": "無効",
    "settings.autoAiLabel": "自動AI",
    "settings.edit": "編集",
    "settings.coreSystemConfig": "コアシステム設定",
    "settings.openConfiguration": "設定を開く",
    "settings.deleteAgentConfirm": "このエージェントを削除しますか？",
    "settings.newAgentName": "新しいエージェント",

    // Agent Edit Modal
    "agentEdit.creationTitle": "エージェント作成プロトコル",
    "agentEdit.modificationTitle": "エージェント変更プロトコル",
    "agentEdit.identification": "エージェント識別",
    "agentEdit.agentName": "エージェント名:",
    "agentEdit.hotkeySequence": "ホットキーシーケンス:",
    "agentEdit.aiParameters": "AIニューラルパラメータ",
    "agentEdit.instructionProtocol": "インストラクションプロトコル:",
    "agentEdit.aiModel": "AIモデル:",
    "agentEdit.temperature": "温度",
    "agentEdit.visualParameters": "ビジュアルパラメータ",
    "agentEdit.agentColor": "エージェントカラー:",
    "agentEdit.systemSettings": "システム設定",
    "agentEdit.enableAgent": "エージェントを有効にする",
    "agentEdit.autoProcessAi": "AIで自動処理",
    "agentEdit.saveAgent": "エージェントを保存",
    "agentEdit.deleteAgent": "削除",
    "agentEdit.deleteConfirm": "このエージェントを完全に削除しますか？",

    // Settings Modal
    "settingsModal.title": "システム設定",
    "settingsModal.loading": "設定を読み込み中...",
    "settingsModal.modules": "モジュール",
    "settingsModal.apiConfig": "API設定",
    "settingsModal.audioSys": "音声システム",
    "settingsModal.coreSys": "コアシステム",
    "settingsModal.dataArch": "データアーカイブ",
    "settingsModal.openaiAuth": "OpenAI認証",
    "settingsModal.apiKey": "APIアクセスキー:",
    "settingsModal.testing": "テスト中...",
    "settingsModal.verified": "確認済み",
    "settingsModal.failed": "失敗",
    "settingsModal.verify": "確認",
    "settingsModal.connectionEstablished": "接続が確立されました",
    "settingsModal.connectionFailed":
      "接続に失敗しました - キーを確認してください",
    "settingsModal.voiceRecognition": "音声認識",
    "settingsModal.languageProtocol": "言語プロトコル:",
    "settingsModal.autoDetect": "自動検出",
    "settingsModal.english": "英語",
    "settingsModal.japanese": "日本語",
    "settingsModal.systemParameters": "システムパラメータ",
    "settingsModal.autoStartup": "自動起動プロトコル",
    "settingsModal.systemTray": "システムトレイデーモン",
    "settingsModal.audioNotifications": "音声通知",
    "settingsModal.dataArchival": "データアーカイブ",
    "settingsModal.audioFilePreservation": "音声ファイル保存",
    "settingsModal.storedIn": "保存先: ~/.aria/recordings",
    "settingsModal.historyBufferSize": "履歴バッファサイズ:",
    "settingsModal.entriesMax": "最大エントリ数",
    "settingsModal.autoPurge": "制限超過時の自動削除",
    "settingsModal.saveConfig": "設定を保存",
    "settingsModal.uiLanguage": "UI言語",
    "settingsModal.uiLanguageDesc": "ユーザーインターフェースの表示言語",

    // Tab Navigation
    "tab.history": "履歴",
    "tab.settings": "設定",

    // Additional missing translations
    "history.copyStt": "STTをコピー",
    "history.copyAi": "AIをコピー",
    "history.copyAll": "すべてコピー",
    "history.audioArchived": "音声アーカイブ済み",
    "history.playAudio": "音声を再生",
    "history.copyTranscription": "文字起こしをコピー",
    "history.copyAiResponse": "AI応答をコピー",
    "history.copyAllContent": "すべての内容をコピー",

    // Results additional
    "results.copyAll": "すべてコピー",
    "results.copyAllContent": "すべての内容をコピー",

    // Agents
    "agents.title": "AIエージェント選択",
    "agents.noAgents": "エージェントが設定されていません",
    "agents.createAgents": "エージェントを作成して開始してください",
    "agents.activeAgent": "アクティブエージェント",
    "agents.noHotkey": "ホットキーなし",

    // Recording screen
    "recording.voiceRecording": "音声録音",
    "recording.autoAiProcessing": "自動AI処理",
    "recording.enabled": "有効",
    "recording.disabled": "無効",
    "recording.processWithAi": "AIで処理",
    "recording.copyTranscription": "文字起こしをコピー",
    "recording.skip": "スキップ",
    "recording.speechRecognitionResult": "音声認識結果",

    // Processing
    "processing.analyzingVoice": "音声入力を解析中...",
    "processing.neuralProcessing": "ニューラルネットワーク処理中...",

    // ModeEditScreen (Agent Management)
    "modeEdit.loadingSettings": "設定を読み込み中...",
    "modeEdit.deleteConfirm": "このエージェントを削除しますか？",
    "modeEdit.agentEdit": "エージェント編集",
    "modeEdit.createAgent": "エージェントを作成",
    "modeEdit.editAgent": "エージェントを編集",
    "modeEdit.createNew": "+ 新規作成",
    "modeEdit.edit": "編集",
    "modeEdit.delete": "削除",
    "modeEdit.save": "保存",
    "modeEdit.cancel": "キャンセル",
    "modeEdit.name": "名前",
    "modeEdit.hotkey": "ホットキー",
    "modeEdit.instruction": "指示文",
    "modeEdit.model": "モデル",
    "modeEdit.temperature": "温度",
    "modeEdit.color": "色",
    "modeEdit.enable": "有効にする",
    "modeEdit.autoProcessAi": "音声認識後にAI処理を自動実行",
    "modeEdit.modelLabel": "モデル:",
    "modeEdit.temperatureLabel": "温度:",
    "modeEdit.statusLabel": "状態:",
    "modeEdit.enabled": "有効",
    "modeEdit.disabled": "無効",
    "modeEdit.aiAutoProcessLabel": "AI自動処理:",
    "modeEdit.colorLabel": "色:",
    "modeEdit.hotkeyPlaceholder": "例: CommandOrControl+Alt+1",
    "modeEdit.newAgentName": "新しいエージェント",
    "modeEdit.modelGpt4": "GPT-4",
    "modeEdit.modelGpt4Vision": "GPT-4 Vision",
    "modeEdit.modelGpt35Turbo": "GPT-3.5 Turbo",

    // Menu
    "menu.openSettings": "設定を開く",
    "menu.showToolbar": "ツールバーを表示する",
    "menu.hideToolbar": "ツールバーを非表示にする",
    "menu.exit": "アプリを終了する",
  },
};

let currentLanguage: Language = "en";

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: string, fallback?: string): string {
  const translation = translations[currentLanguage]?.[key];
  if (translation) {
    return translation;
  }

  // Fallback to English if not found in current language
  if (currentLanguage !== "en") {
    const englishTranslation = translations.en[key];
    if (englishTranslation) {
      return englishTranslation;
    }
  }

  // Return fallback or key if nothing found
  return fallback || key;
}

export function initializeLanguage(): Language {
  // Try to get saved language from localStorage
  try {
    const saved = localStorage.getItem("aria-language") as Language;
    if (saved && (saved === "en" || saved === "ja")) {
      setLanguage(saved);
      return saved;
    }
  } catch (error) {
    console.warn("Failed to load saved language:", error);
  }

  // Auto-detect from system locale
  const systemLang = navigator.language || navigator.languages?.[0] || "en";
  const detectedLang: Language = systemLang.startsWith("ja") ? "ja" : "en";

  setLanguage(detectedLang);

  // Save to localStorage
  try {
    localStorage.setItem("aria-language", detectedLang);
  } catch (error) {
    console.warn("Failed to save language preference:", error);
  }

  return detectedLang;
}

export function toggleLanguage(): Language {
  const newLang: Language = currentLanguage === "en" ? "ja" : "en";
  setLanguage(newLang);

  try {
    localStorage.setItem("aria-language", newLang);
  } catch (error) {
    console.warn("Failed to save language preference:", error);
  }

  return newLang;
}
