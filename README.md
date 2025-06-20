# 🎯 Aura - AI Voice Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Aura**は、OpenAI APIを活用したモダンなAI音声アシスタントです。音声を録音し、AIが様々なタスクを実行して結果を返します。

![Aura Screenshot](docs/screenshot.png)

## ✨ 主な機能

### 🎤 高精度音声認識
- **OpenAI Whisper API**による業界最高レベルの音声認識
- **多言語対応**：日本語、英語、自動検出
- **リアルタイム処理**：即座に音声をテキスト化

### 🤖 インテリジェントなAIエージェント
| ホットキー | エージェント | 用途 |
|-----------|-------------|------|
| `Ctrl+Alt+1` | 📝 文字起こし | 会議・講義の記録 |
| `Ctrl+Alt+2` | 📄 文書作成 | メール・レポート下書き |
| `Ctrl+Alt+3` | 🔍 検索キーワード生成 | Web検索最適化 |
| `Ctrl+Alt+4` | ❓ テキストQ&A | 文書要約・質問回答 |
| `Ctrl+Alt+5` | 🖼️ 画像Q&A | 画像解析・説明 |
| `Ctrl+Alt+6` | 🌐 Web自動操作 | Playwright連携タスク |

### 🎨 モダンなUI/UX
- **React + Tailwind CSS**による美しいインターフェース
- **レスポンシブデザイン**：あらゆる画面サイズに対応
- **ダークモード対応**：目に優しい表示
- **アニメーション**：滑らかな操作体験

### ⚡ 高度なシステム統合
- **グローバルホットキー**：どこからでも瞬時に起動
- **システムトレイ**：バックグラウンド実行
- **自動コピー**：結果をクリップボードに自動保存
- **クロスプラットフォーム**：Windows、macOS、Linux対応

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- OpenAI API キー（[こちら](https://platform.openai.com/api-keys)で取得）

### インストール
```bash
# リポジトリクローン
git clone https://github.com/your-username/aura.git
cd aura

# 依存関係インストール
npm install

# アプリケーション起動
npm start
```

### 初期設定
1. アプリケーション起動後、⚙️ **設定**ボタンをクリック
2. **OpenAI API Key**を入力
3. **🔄 接続テスト**で動作確認
4. **💾 保存**をクリック

これで準備完了です！🎉

## 📖 使い方

### 基本的な流れ
1. **エージェント選択**：使いたいAIエージェントをクリック
2. **音声録音**：🎤ボタンで録音開始（エージェント選択で自動開始）
3. **結果確認**：📝音声認識 → 🧠AI処理結果をタブで確認

### 使用例

#### 📝 会議の文字起こし
```
音声入力: 「えーっと、今日の売上なんですけど、前月比で15%増加してまして...」
↓ AI処理
出力: 「今日の売上について、前月比で15%増加しており...」
```

#### 📄 メール下書き作成
```
音声入力: 「明日の会議の件で田中さんに連絡したくて」
↓ AI処理
出力: 
件名: 明日の会議について
本文: 田中様、いつもお世話になっております。
明日の会議の件でご連絡いたします...
```

## 🛠️ 技術スタック

### フロントエンド
- **React 18** - モダンなUIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - ユーティリティファーストCSS
- **Vite** - 高速ビルドツール

### デスクトップ
- **Electron 36** - クロスプラットフォーム対応
- **Node.js** - ランタイム環境

### AI・API
- **OpenAI Whisper** - 音声認識
- **OpenAI GPT-4** - 自然言語処理

## 📁 プロジェクト構造

```
aura/
├── src/
│   ├── components/          # Reactコンポーネント
│   ├── context/            # 状態管理（React Context）
│   ├── services/           # ビジネスロジック
│   ├── types/              # TypeScript型定義
│   ├── config/             # 設定ファイル
│   ├── main.ts             # Electronメインプロセス
│   ├── preload.ts          # Preloadスクリプト
│   └── renderer.tsx        # Reactエントリーポイント
├── docs/                   # ドキュメント
├── forge.config.ts         # Electron Forge設定
└── package.json
```

## 📚 ドキュメント

- **[ユーザーマニュアル](USER_MANUAL.md)** - 詳しい使い方ガイド
- **[設定ガイド](SETTINGS_GUIDE.md)** - 設定ファイルとデータ保存場所
- **[開発者ガイド](DEVELOPER_GUIDE.md)** - 開発・カスタマイズ方法

## 🔧 開発

### 開発環境セットアップ
```bash
# 依存関係インストール
npm install

# 開発サーバー起動（ホットリロード付き）
npm start

# ビルド
npm run make

# リント
npm run lint

# 型チェック
npm run typecheck
```

### コントリビューション
1. このリポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

## 🔐 プライバシー・セキュリティ

- **ローカル処理**：音声ファイルは処理後即座に削除
- **暗号化**：APIキーは暗号化してローカル保存
- **データ保護**：個人情報は外部サーバーに送信されません
- **オープンソース**：コードは完全に公開、透明性を確保

## 📄 ライセンス

このプロジェクトは[MIT License](LICENSE)の下で公開されています。

## 🙏 謝辞

- [OpenAI](https://openai.com/) - WhisperとGPT APIの提供
- [Electron](https://www.electronjs.org/) - クロスプラットフォームフレームワーク
- [React](https://reactjs.org/) - UIライブラリ
- [Tailwind CSS](https://tailwindcss.com/) - CSSフレームワーク

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/your-username/aura/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/aura/discussions)
- **Email**: support@aura-app.com

---

<div align="center">

**Auraで、音声がもっと価値のあるテキストに変わる** 🎤✨

[⭐ Star this repo](https://github.com/your-username/aura) | [🐛 Report Bug](https://github.com/your-username/aura/issues) | [💡 Request Feature](https://github.com/your-username/aura/issues)

</div>