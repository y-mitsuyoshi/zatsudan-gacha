# 雑談テーマガチャ (Zatsudan Theme Gacha)

リモートワークやオンラインでの交流が増える中、ふとした雑談のきっかけを見つけるのが難しいことがあります。この「雑談テーマガチャ」は、そんな悩みを解決するために作られたWebアプリケーションです。ボタン一つでランダムな会話のテーマを提供し、コミュニケーションを円滑にします。

## ✨ 主な機能

- **カテゴリ別テーマ**: 「趣味」「旅行」「仕事」など、様々なカテゴリからテーマを絞り込めます。もちろん、すべてのテーマからランダムに選ぶことも可能です。
- **ガチャ演出**: ボタンを押すと、テーマが高速で切り替わるアニメーションで、ガチャを回すワクワク感を楽しめます。
- **AIによる深掘り**: Gemini APIを活用し、選ばれたテーマに対して「AIに深掘り質問を考えてもらう」機能があります。これにより、一つのテーマからさらに会話を広げることができます。本番環境では、Firebase Functionsを使用してAPIキーの安全性を確保しています。

## 🚀 はじめに

このアプリケーションをローカル環境で動かすための手順です。

### 1. 前提条件

- [Node.js](https://nodejs.org/) (`v22.14.0`以降を推奨)
- [pnpm](https://pnpm.io/ja/) (v9以降)
- [Git](https://git-scm.com/)

### 2. インストール

1. **リポジトリをクローンする**
   ```bash
   git clone https://github.com/your-username/zatsudan-gacha.git
   cd zatsudan-gacha
   ```

2. **依存関係をインストールする**

   このプロジェクトでは、パッケージマネージャーとして`pnpm`を使用します。`pnpm`がインストールされていない場合は、以下のコマンドでインストールしてください。
   ```bash
   npm install -g pnpm
   ```

   準備ができたら、依存関係をインストールします。
   ```bash
   pnpm install
   ```

### 3. 環境変数の設定

AIによる深掘り機能を利用するには、Google Gemini APIキーが必要です。

1. **`.env.example`をコピーして`.env.local`を作成します。**
   ```bash
   cp .env.example .env.local
   ```

2. **`.env.local`ファイルを開き、あなたのAPIキーを設定します。**
   ```
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```
   APIキーは[Google AI Studio](https://aistudio.google.com/app/apikey)で取得できます。

### 4. 開発サーバーの起動

以下のコマンドを実行すると、開発サーバーが起動します。

```bash
pnpm run dev
```

ブラウザで `http://localhost:3000` を開くと、アプリケーションが表示されます。

## 🛠️ 使用技術

- [Next.js](https://nextjs.org/) – Reactフレームワーク
- [React](https://react.dev/) – UIライブラリ
- [TypeScript](https://www.typescriptlang.org/) – 型付け
- [Tailwind CSS](https://tailwindcss.com/) – CSSフレームワーク
- [Google Gemini API](https://ai.google.dev/) – AIモデル
- [Firebase](https://firebase.google.com/) – ホスティング・Functions（本番環境）

## 🔥 Firebaseへのデプロイ

このアプリケーションはFirebase HostingとFirebase Functionsにデプロイできます。本番環境では、セキュリティを向上させるためにFirebase FunctionsでGemini APIを処理します。

### 前提条件

1. **Firebaseプロジェクトの作成**
   - [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
   - Firebase Hostingを有効化
   - Firebase Functionsを有効化（Blazeプランが必要ですが、無料枠内で十分利用可能）

2. **Firebaseツールの準備**
   ```bash
   npm install -g firebase-tools
   ```

3. **Firebaseへのログイン**
   ```bash
   firebase login
   ```

### セキュアなAPIキー設定

本番環境では、APIキーをFirebase Functionsの環境変数として設定します：

```bash
# Gemini APIキーを設定
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"

# 設定を確認
firebase functions:config:get
```

### デプロイ手順

1. **プロジェクトのビルド**
   ```bash
   pnpm run build
   ```

2. **Firebase Functionsのビルド**
   ```bash
   cd functions
   npm run build
   cd ..
   ```
   
   > **注**: Firebase Functionsディレクトリでは、Firebase CLIとの互換性のためnpmを使用します。

3. **デプロイの実行**

   **すべてをデプロイ（推奨）:**
   ```bash
   pnpm run deploy
   ```

   **個別にデプロイする場合:**
   ```bash
   # Functionsのみ
   pnpm run deploy:functions
   
   # Hostingのみ
   pnpm run deploy:hosting
   ```

### 環境の違い

- **開発環境**: Next.js API Routes使用（`/api/gemini`）
- **本番環境**: Firebase Functions使用（`https://us-central1-{project-id}.cloudfunctions.net/gemini`）

### セキュリティ機能

本番環境では以下のセキュリティ機能が有効になります：

- **APIキー保護**: Firebase Functionsの環境変数で管理
- **CORS設定**: 信頼できるドメインからのアクセスのみ許可
- **レート制限**: 1IPアドレスあたり1時間に10回まで
- **キャッシュ機能**: 同一テーマを30分間キャッシュ

### Firebase設定ファイル

`.firebaserc.example` を使用して設定：

```bash
cp .firebaserc.example .firebaserc
# エディタで "REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID" を実際のプロジェクトIDに置き換え
```

### デプロイ後の確認

デプロイが完了したら、以下で動作確認：

```bash
# API動作テスト
curl -X POST \
  https://us-central1-{your-project-id}.cloudfunctions.net/gemini \
  -H "Content-Type: application/json" \
  -d '{"theme":"テストテーマ"}'
```

### トラブルシューティング

- **Functions デプロイエラー**: `firebase functions:config:get`でAPI設定を確認
- **CORS エラー**: `functions/src/index.ts`でドメイン設定を確認
- **Node.js バージョンエラー**: Functions用にNode.js 18以上が必要

詳細な設定手順は `FIREBASE_SETUP.md` および `SECURITY_SETUP.md` をご参照ください。
