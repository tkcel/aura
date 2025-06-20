# 🎯 Aura - 設定ファイルとデータ保存場所ガイド

## 📁 ファイル保存場所の概要

Auraアプリケーションは、設定ファイルや一時ファイルを特定の場所に保存します。このガイドでは、それらの場所と内容について説明します。

## 🔧 設定ファイル

### メイン設定ファイル
**場所**: `~/.aura/settings.json`
- **説明**: アプリケーションの全設定を保存
- **フォーマット**: JSON形式
- **作成タイミング**: 初回起動時に自動作成

#### 設定ファイルの構造
```json
{
  "openaiApiKey": "sk-...",
  "language": "auto",
  "audioDevice": null,
  "agents": [
    {
      "id": "transcription",
      "name": "文字起こし",
      "hotkey": "CommandOrControl+Alt+1",
      "instruction": "音声から正確にテキストを文字起こししてください...",
      "model": "gpt-4",
      "temperature": 0.3,
      "enabled": true
    }
  ],
  "autoStartup": false,
  "systemTray": true,
  "soundNotifications": true
}
```

### 設定項目の詳細

#### 🔑 API設定
- `openaiApiKey`: OpenAI APIキー（暗号化されて保存）
- `language`: 音声認識言語 (`"auto"`, `"ja"`, `"en"`)

#### 🤖 エージェント設定
- `agents`: AIエージェントの配列
  - `id`: エージェントの一意識別子
  - `name`: 表示名
  - `hotkey`: ショートカットキー
  - `instruction`: AI処理の指示文
  - `model`: 使用するAIモデル
  - `temperature`: 創造性レベル (0.0-1.0)
  - `enabled`: 有効/無効フラグ

#### 🎛️ システム設定
- `autoStartup`: PC起動時の自動起動
- `systemTray`: システムトレイ常駐
- `soundNotifications`: 音声通知

## 🎤 音声ファイル

### 一時音声ファイル
**場所**: システムの一時ディレクトリ
- **macOS**: `/var/folders/.../aura-audio/`
- **Windows**: `%TEMP%\aura-audio\`
- **Linux**: `/tmp/aura-audio/`

#### ファイル命名規則
- **フォーマット**: `recording-{timestamp}.wav`
- **例**: `recording-1703123456789.wav`
- **自動削除**: 処理完了後に自動削除

## 📋 ログファイル

### アプリケーションログ
**場所**: `~/.aura/logs/`
- `app.log`: メインアプリケーションログ
- `error.log`: エラーログ
- `audio.log`: 音声処理ログ

## 🔐 セキュリティとプライバシー

### APIキーの保護
- APIキーは暗号化されて保存
- 設定ファイルは適切なファイル権限で保護
- 音声ファイルは処理後即座に削除

### プライバシー保護
- 音声データはローカルでのみ処理
- OpenAI APIに送信される音声データは一時的
- 個人情報は外部サーバーに保存されない

## 🛠️ 設定のバックアップと復元

### 設定のバックアップ
```bash
# 設定ディレクトリ全体をバックアップ
cp -r ~/.aura ~/Documents/aura-backup-$(date +%Y%m%d)
```

### 設定の復元
```bash
# バックアップから復元
cp -r ~/Documents/aura-backup-20231220 ~/.aura
```

### 設定のリセット
```bash
# 設定を完全にリセット
rm -rf ~/.aura
# アプリケーション再起動で初期設定が作成される
```

## 📁 ディレクトリ構造

```
~/.aura/
├── settings.json          # メイン設定ファイル
├── logs/                  # ログファイル
│   ├── app.log           # アプリケーションログ
│   ├── error.log         # エラーログ
│   └── audio.log         # 音声処理ログ
└── cache/                # キャッシュファイル（将来の拡張用）
    └── models/           # ローカルモデルキャッシュ
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 設定が保存されない
1. ディレクトリの権限を確認
   ```bash
   ls -la ~/.aura
   chmod 755 ~/.aura
   ```

2. 設定ファイルの権限を確認
   ```bash
   chmod 644 ~/.aura/settings.json
   ```

#### 音声録音ができない
1. 一時ディレクトリの権限を確認
2. ディスクの空き容量を確認
3. マイクアクセス権限を確認

#### APIキーが認識されない
1. 設定ファイルの形式を確認
2. APIキーの有効性をテスト
3. ネットワーク接続を確認

### 設定ファイルの手動編集

設定ファイルを直接編集する場合は、必ずアプリケーションを終了してから行ってください。

```bash
# アプリケーション終了後
nano ~/.aura/settings.json
```

## 🚀 高度な設定

### カスタムエージェントの追加
設定ファイルを直接編集して、新しいエージェントを追加できます：

```json
{
  "id": "custom-agent",
  "name": "カスタムエージェント",
  "hotkey": "CommandOrControl+Alt+7",
  "instruction": "あなたのカスタム指示をここに記載...",
  "model": "gpt-4",
  "temperature": 0.7,
  "enabled": true
}
```

### 環境変数での設定
一部の設定は環境変数で上書き可能です：

```bash
export AURA_API_KEY="sk-your-api-key"
export AURA_LANGUAGE="ja"
export AURA_LOG_LEVEL="debug"
```

## 📞 サポート

設定に関して問題がある場合は、以下の情報を含めてサポートにお問い合わせください：

- OS とバージョン
- Aura アプリケーションのバージョン
- 設定ファイルの内容（APIキーは除く）
- エラーログの内容

---

**注意**: APIキーやその他の機密情報は、決して他人と共有しないでください。