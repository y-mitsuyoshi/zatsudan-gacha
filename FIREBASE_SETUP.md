# Firebase Functions デプロイ手順

## 1. 環境変数の設定

Firebase Functions で Gemini API を使用するために、環境変数を設定します：

```bash
# Firebase CLI で環境変数を設定
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"

# 設定を確認
firebase functions:config:get
```

## 2. Functions のデプロイ

```bash
# Functions のみをデプロイ
npm run deploy:functions

# 全体をデプロイ（Hosting + Functions）
npm run deploy
```

## 3. 本番環境での確認

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
- 1IPアドレスあたり1時間に10回まで
- メモリベースの制限（Function再起動時にリセット）

### キャッシュ機能
- 同一テーマのリクエストを30分間キャッシュ
- APIコール数の削減

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
- APIキーは開発環境では `.env.local`、本番環境では Firebase Functions の環境変数で管理
