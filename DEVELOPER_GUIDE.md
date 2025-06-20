# 🛠️ Aura - 開発者ガイド

## 📋 目次
1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [アーキテクチャ](#アーキテクチャ)
4. [開発環境のセットアップ](#開発環境のセットアップ)
5. [ファイル構造](#ファイル構造)
6. [コンポーネント設計](#コンポーネント設計)
7. [状態管理](#状態管理)
8. [Electron統合](#electron統合)
9. [ビルドとデプロイ](#ビルドとデプロイ)
10. [拡張・カスタマイズ](#拡張カスタマイズ)

## 🎯 プロジェクト概要

AuraはElectron + React + TypeScript + Tailwind CSSで構築されたAI音声アシスタントアプリケーションです。

### 主要機能
- OpenAI Whisper APIによる音声認識
- OpenAI GPT-4による自然言語処理
- モジュラーなAIエージェントシステム
- グローバルホットキーサポート
- システムトレイ統合

## 🔧 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Vite** - ビルドツール

### バックエンド/デスクトップ
- **Electron 36** - デスクトップアプリフレームワーク
- **Node.js** - ランタイム環境

### 外部API
- **OpenAI API** - 音声認識（Whisper）と言語処理（GPT-4）

### 開発ツール
- **Electron Forge** - パッケージングとビルド
- **ESLint** - コード品質
- **PostCSS** - CSS処理

## 🏗️ アーキテクチャ

### 全体アーキテクチャ
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Renderer      │    │   Main Process  │    │   OpenAI API    │
│   (React UI)    │◄──►│   (Electron)    │◄──►│   (Whisper/GPT) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Context API   │    │   File System   │
│   (State Mgmt)  │    │   (Settings)    │
└─────────────────┘    └─────────────────┘
```

### プロセス間通信
- **IPC (Inter-Process Communication)**: メインプロセスとレンダラープロセス間
- **contextBridge**: セキュアなAPI公開
- **ipcMain/ipcRenderer**: 双方向通信

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Git

### インストール手順
```bash
# リポジトリクローン
git clone <repository-url>
cd aura

# 依存関係インストール
npm install

# 開発サーバー起動
npm start

# 本番ビルド
npm run make
```

### 環境変数
開発時に使用可能な環境変数：

```bash
# .env.local
VITE_DEV_MODE=true
ELECTRON_LOG_LEVEL=debug
```

## 📁 ファイル構造

```
aura/
├── src/
│   ├── components/          # Reactコンポーネント
│   │   ├── App.tsx         # メインアプリコンポーネント
│   │   ├── Header.tsx      # ヘッダーコンポーネント
│   │   ├── AgentSection.tsx
│   │   ├── RecordingControls.tsx
│   │   ├── ResultsSection.tsx
│   │   ├── SettingsModal.tsx
│   │   └── ProcessingOverlay.tsx
│   ├── context/            # React Context
│   │   └── AppContext.tsx  # アプリケーション状態管理
│   ├── services/           # ビジネスロジック
│   │   ├── settings.ts     # 設定管理
│   │   ├── audio.ts        # 音声処理
│   │   └── llm.ts          # LLM統合
│   ├── config/             # 設定ファイル
│   │   └── default-agents.ts
│   ├── types/              # TypeScript型定義
│   │   └── index.ts
│   ├── utils/              # ユーティリティ
│   ├── main.ts             # Electronメインプロセス
│   ├── preload.ts          # Preloadスクリプト
│   ├── renderer.tsx        # Reactエントリーポイント
│   └── index.css           # Tailwindスタイル
├── forge.config.ts         # Electron Forge設定
├── vite.*.config.ts        # Vite設定
├── tailwind.config.js      # Tailwind設定
├── tsconfig.json           # TypeScript設定
└── package.json            # プロジェクト設定
```

## 🧩 コンポーネント設計

### コンポーネント階層
```
App
├── Header
├── AgentSection
├── RecordingControls  
├── ResultsSection
├── SettingsModal
└── ProcessingOverlay
```

### デザインパターン
- **Compound Components**: 複雑なUIの構成
- **Render Props**: 柔軟なコンポーネント設計
- **Custom Hooks**: ロジックの再利用

### 例: カスタムフック
```typescript
// useRecording.ts
export function useRecording() {
  const { isRecording, startRecording, stopRecording } = useApp();
  
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);
  
  return {
    isRecording,
    toggleRecording: handleToggleRecording
  };
}
```

## 🗄️ 状態管理

### Context + useReducer パターン
```typescript
// AppContext.tsx
interface AppContextState {
  settings: AppSettings | null;
  currentState: AppState;
  selectedAgent: string | null;
  isRecording: boolean;
  sttResult: STTResult | null;
  llmResult: ProcessingResult | null;
  error: string | null;
}

type AppAction = 
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_STATE'; payload: AppState }
  // ... その他のアクション
```

### 状態の流れ
1. **ユーザーアクション** → Context の dispatch
2. **Reducer** → 新しい状態を計算
3. **Context** → 全コンポーネントに状態を配信
4. **コンポーネント** → UIを更新

## ⚡ Electron統合

### メインプロセス
```typescript
// main.ts
class AuraApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsService: SettingsService;
  private audioService: AudioService;
  private llmService: LLMService;

  private setupIpcHandlers(): void {
    ipcMain.handle('get-settings', () => {
      return this.settingsService.getSettings();
    });
    
    ipcMain.handle('start-recording', async () => {
      // 録音開始処理
    });
  }
}
```

### Preloadスクリプト
```typescript
// preload.ts
const api = {
  getSettings: (): Promise<AppSettings> => 
    ipcRenderer.invoke('get-settings'),
  
  startRecording: (): Promise<{success: boolean}> => 
    ipcRenderer.invoke('start-recording'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

### セキュリティ
- **Context Isolation**: 有効化
- **Node Integration**: 無効化
- **Preload Script**: セキュアなAPI公開

## 🔨 ビルドとデプロイ

### 開発ビルド
```bash
npm start          # 開発サーバー起動
npm run lint       # コード品質チェック
npm run typecheck  # 型チェック
```

### 本番ビルド
```bash
npm run make       # 実行可能ファイル生成
npm run publish    # 配布用パッケージ作成
```

### 配布形式
- **macOS**: .dmg, .zip
- **Windows**: .exe, .msi
- **Linux**: .deb, .rpm, .AppImage

### CI/CD
```yaml
# .github/workflows/build.yml
name: Build and Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run make
```

## 🔧 拡張・カスタマイズ

### 新しいエージェントの追加
1. **型定義を更新**:
```typescript
// types/index.ts
export interface Agent {
  id: string;
  name: string;
  hotkey: string;
  instruction: string;
  model: string;
  temperature: number;
  enabled: boolean;
  // 新しいプロパティ
  category?: string;
  description?: string;
}
```

2. **デフォルトエージェントに追加**:
```typescript
// config/default-agents.ts
export const DEFAULT_AGENTS: Agent[] = [
  // 既存のエージェント...
  {
    id: 'new-agent',
    name: '新しいエージェント',
    hotkey: 'CommandOrControl+Alt+7',
    instruction: '新しい機能の指示...',
    model: 'gpt-4',
    temperature: 0.5,
    enabled: true
  }
];
```

3. **UI更新**: AgentSectionコンポーネントが自動的に新しいエージェントを表示

### カスタムサービスの追加
```typescript
// services/custom-service.ts
export class CustomService {
  public async processCustomTask(input: string): Promise<string> {
    // カスタム処理ロジック
    return result;
  }
}

// main.ts でサービスを統合
private customService: CustomService;

private setupIpcHandlers(): void {
  ipcMain.handle('custom-task', async (_, input) => {
    return this.customService.processCustomTask(input);
  });
}
```

### テーマのカスタマイズ
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          // カスタムカラーパレット
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  }
}
```

### プラグインシステム
将来的にプラグインシステムを追加する場合の設計例：

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  activate(): void;
  deactivate(): void;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  public loadPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    plugin.activate();
  }
}
```

## 🧪 テスト

### テスト構造
```bash
tests/
├── unit/           # ユニットテスト
├── integration/    # 統合テスト
└── e2e/           # エンドツーエンドテスト
```

### テストツール
- **Jest**: ユニット・統合テスト
- **React Testing Library**: Reactコンポーネントテスト
- **Spectron**: Electronアプリテスト

### テスト例
```typescript
// tests/unit/services/settings.test.ts
describe('SettingsService', () => {
  test('should load default settings', () => {
    const service = new SettingsService();
    const settings = service.getSettings();
    expect(settings.language).toBe('auto');
  });
});
```

## 📚 参考リソース

### 公式ドキュメント
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### コミュニティリソース
- [Electron Community](https://github.com/electron-userland)
- [React Community](https://github.com/reactjs)

---

## 🤝 コントリビューション

1. **Issue報告**: バグや機能要望
2. **Pull Request**: コード改善
3. **ドキュメント**: 説明の改善
4. **翻訳**: 多言語対応

### 開発ガイドライン
- TypeScriptを使用
- ESLintルールに従う
- コンポーネントは小さく保つ
- テストを書く
- コミットメッセージは明確に

**Happy Coding! 🚀**