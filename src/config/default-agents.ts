import { Agent } from '../types';

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'transcription',
    name: '文字起こし',
    hotkey: 'CommandOrControl+Alt+1',
    instruction: `音声から正確にテキストを文字起こししてください。
以下の点に注意してください：
- 句読点を適切に配置する
- 改行は意味のある区切りで行う  
- 数字や固有名詞は正確に記載する
- 話し言葉を自然な文章に整える`,
    model: 'gpt-4',
    temperature: 0.3,
    enabled: true
  },
  {
    id: 'document-creation',
    name: '文書作成',
    hotkey: 'CommandOrControl+Alt+2',
    instruction: `音声入力を元に、ビジネス文書を作成してください。
以下の形式で出力してください：
- 件名/タイトル
- 本文（敬語・丁寧語を使用）
- 必要に応じて箇条書きや段落分け
- 簡潔で分かりやすい表現に変換`,
    model: 'gpt-4',
    temperature: 0.7,
    enabled: true
  },
  {
    id: 'search-keywords',
    name: '検索キーワード生成',
    hotkey: 'CommandOrControl+Alt+3',
    instruction: `音声入力から効果的な検索キーワードを生成してください。
以下の形式で出力してください：
- メインキーワード（3-5個）
- 関連キーワード（5-10個）
- 除外キーワード（必要に応じて）
- 検索オペレーター付きクエリ例`,
    model: 'gpt-4',
    temperature: 0.5,
    enabled: true
  },
  {
    id: 'text-qa',
    name: 'テキストQ&A',
    hotkey: 'CommandOrControl+Alt+4',
    instruction: `音声で質問された内容に対して、正確で分かりやすい回答を提供してください。
以下の点を重視してください：
- 質問の意図を正確に理解する
- 具体的で実用的な回答をする
- 必要に応じて例や手順を含める
- 不明な点があれば明示する`,
    model: 'gpt-4',
    temperature: 0.6,
    enabled: true
  },
  {
    id: 'image-qa',
    name: '画像Q&A',
    hotkey: 'CommandOrControl+Alt+5',
    instruction: `画像と音声質問を組み合わせて回答してください。
以下の手順で処理してください：
1. 画像の内容を詳細に分析
2. 音声質問の意図を理解
3. 画像と質問を関連付けて回答
4. 必要に応じて画像の特定部分を指摘`,
    model: 'gpt-4-vision-preview',
    temperature: 0.7,
    enabled: true
  },
  {
    id: 'web-automation',
    name: 'Web自動操作',
    hotkey: 'CommandOrControl+Alt+6',
    instruction: `音声指示を元にWeb自動操作のスクリプトを生成してください。
以下の形式で出力してください：
- 操作手順の説明
- Playwrightコード例
- 注意事項やエラーハンドリング
- 実行前の確認事項`,
    model: 'gpt-4',
    temperature: 0.8,
    enabled: true
  }
];