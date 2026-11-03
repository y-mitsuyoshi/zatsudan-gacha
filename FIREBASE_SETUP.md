# Firebase セットアップ手順

## 1. Firebase プロジェクトの設定

### Firebase Console での設定
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成（既にある場合はスキップ）
3. Analytics を有効にする
4. プロジェクト設定から設定値を取得

### 環境変数の設定
`.env.local` ファイルを作成し、以下の値を設定してください：

```bash
# OpenCode Go (https://opencode.ai/console) で取得したAPIキーを設定してください
# 開発環境でのみ使用（本番環境ではFirebase Functionsのシークレットで管理）
OPENCODE_GO_API_KEY="YOUR_OPENCODE_GO_API_KEY"

# 任意: 使用するモデルID（未指定時は deepseek-v4.1-flash）
# OPENCODE_GO_MODEL="deepseek-v4.1-flash"

# Firebase 設定（Firebase Console のプロジェクト設定から取得）
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
```

## 2. Firebase Functions の設定

Firebase Functions で OpenCode Go API を使用するために、シークレットを設定します：

```bash
# Firebase CLI でシークレットを設定
firebase functions:secrets:set OPENCODE_GO_API_KEY

# 設定済みか確認（値は表示しない）
firebase functions:secrets:describe OPENCODE_GO_API_KEY
```

## 2. Functions のデプロイ

```bash
# Functions のみをデプロイ
npm run deploy:functions

# 全体をデプロイ（Hosting + Functions）
npm run deploy
```

## 3. Firebase Analytics の確認

デプロイ後、Firebase Console で Analytics データを確認できます：

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを選択
3. 左メニューの「Analytics」→「ダッシュボード」を選択
4. リアルタイムまたは過去のデータを確認

### トラッキングされるイベント
- `page_view`: ページビュー
- `gacha_spin`: ガチャ実行
- `gacha_result`: ガチャ結果
- `category_changed`: カテゴリ変更
- `game_mode_changed`: ゲームモード変更
- `ai_dig_deeper_requested`: AI深掘り機能使用
- `ai_dig_deeper_success`: AI深掘り成功
- `ai_dig_deeper_error`: AI深掘りエラー
- `ai_question_copied`: AI質問コピー
- `theme_copied`: テーマコピー
- `favorite_toggled`: お気に入り追加/削除

## 4. 本番環境での確認

デプロイ後、以下のエンドポイントでAPIが動作するか確認してください：

```
https://us-central1-zatsudan-gacha.cloudfunctions.net/gemini
```

## セキュリティ機能

### CORS設定
- 許可されたオリジンのみからのアクセス
- 本番環境: zatsudan-gacha.web.app, zatsudan-gacha.firebaseapp.com
- 開発環境: localhost:3000

### レート制限
- 1IPアドレスあたり1日20回まで（短時間の連打は一時ブロック、全体の1日上限も設定）
- メモリベースの制限（Function再起動時にリセット）

### 入力データの取り扱い
- AIへの入力内容と生成結果はサーバーに保存しない
- ユーザー間でAIの入力・生成結果を共有しない
- プロンプト、生成結果、APIキーはログに出力しない

## API仕様

### エンドポイント
`POST /gemini`

### リクエスト
```json
{
  "theme": "お気に入りの映画"
}
```

### レスポンス
```json
{
  "text": "• その映画の何が一番印象に残りましたか？\n• もしその映画の続編を作るとしたら、どんなストーリーにしたいですか？\n• その映画を観たときの状況や感情を覚えていますか？"
}
```

## エラー処理

- 400: 不正なリクエスト（themeが未指定など）
- 405: 許可されていないHTTPメソッド
- 429: レート制限超過
- 500: サーバーエラー

## 開発環境との違い

- **開発環境**: `/api/gemini` エンドポイントを使用（Next.js API Routes）
- **本番環境**: Firebase Functions エンドポイントを使用
- APIキーは開発環境では `.env.local`、本番環境では Firebase Functions のシークレットで管理
