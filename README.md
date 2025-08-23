# 雑談テーマガチャ (Zatsudan Theme Gacha)

リモートワークやオンラインでの交流が増える中、ふとした雑談のきっかけを見つけるのが難しいことがあります。この「雑談テーマガチャ」は、そんな悩みを解決するために作られたWebアプリケーションです。ボタン一つでランダムな会話のテーマを提供し、コミュニケーションを円滑にします。

## ✨ 主な機能

- **カテゴリ別テーマ**: 「趣味」「旅行」「仕事」など、様々なカテゴリからテーマを絞り込めます。もちろん、すべてのテーマからランダムに選ぶことも可能です。
- **ガチャ演出**: ボタンを押すと、テーマが高速で切り替わるアニメーションで、ガチャを回すワクワク感を楽しめます。
- **AIによる深掘り**: Gemini APIを活用し、選ばれたテーマに対して「AIに深掘り質問を考えてもらう」機能があります。これにより、一つのテーマからさらに会話を広げることができます。

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

## 🔥 Firebaseへのデプロイ

このアプリケーションはFirebase Hostingにデプロイできます。

### 1. Firebaseツールの準備

プロジェクトには`firebase-tools`が開発依存関係として含まれていますが、グローバルにインストールしておくと便利です。

```bash
npm install -g firebase-tools
```

### 2. Firebaseへのログイン

次のコマンドを実行し、ブラウザでFirebaseアカウントにログインします。

```bash
firebase login
```

### 3. プロジェクトのビルド

デプロイする前に、Next.jsアプリケーションを静的ファイルとしてビルドする必要があります。

```bash
pnpm run build
```

このコマンドにより、`out`ディレクトリにデプロイ用のファイルが生成されます。

### 4. 環境変数の設定（重要）

デプロイ前に、本番環境用の環境変数を設定する必要があります。Next.jsの静的エクスポートでは、ビルド時に環境変数が埋め込まれるため、**ローカルでビルドしてからデプロイ**する必要があります。

1. **本番用の`.env.local`を作成**
   ```bash
   cp .env.example .env.local
   ```

2. **実際のAPIキーを設定**
   `.env.local`ファイルを開き、あなたのAPIキーを設定します：
   ```bash
   GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
   ```

**⚠️ セキュリティ注意事項:**
- `.env.local`は`.gitignore`に含まれているため、GitHubにプッシュされることはありません
- ただし、静的サイトではAPIキーがクライアント側のJavaScriptに埋め込まれるため、完全に秘匿することはできません
- 本番環境では、Gemini APIキーに適切な制限（HTTPリファラー制限など）を設定することを強く推奨します

### 5. デプロイの実行

環境変数を設定した状態で、ローカルでビルドしてからFirebaseにデプロイします。

```bash
# ローカルでビルド（この時点で.env.localの値が埋め込まれます）
pnpm run build

# Firebaseにデプロイ
firebase deploy --only hosting
```

デプロイが完了すると、コンソールに表示されるURLでアプリケーションにアクセスできます。

### `.firebaserc.example` の使い方（重要）

リポジトリには個人のFirebase設定を含む `.firebaserc` を直接コミットしないためのテンプレートファイル
`.firebaserc.example` を用意しています。デプロイする際はローカルで実際のプロジェクトIDを設定した `.firebaserc`
ファイルを作成してください。

手順:

1. リポジトリをクローンまたは取得した後、テンプレートをコピーして自分のプロジェクトIDに置き換えます。

```bash
cp .firebaserc.example .firebaserc
# もしくはエディタで開いて "REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID" を実際の projectId に書き換える
```

2. `.firebaserc` は `.gitignore` に含まれているため、誤ってリモートに上がることはありません。

3. その後、通常通りビルド・デプロイします。

```bash
pnpm run build
firebase deploy --only hosting
```

注意点:

- 複数人で作業する場合は、各自が自分の `.firebaserc` を作成してください。共通の設定を共有する必要がある場合は、`.firebaserc.example` を更新してプロジェクト固有のヒントを追記してください。
- リポジトリに含めるのはテンプレートのみとし、個人用のキーやプロジェクトIDはコミットしないでください。

## 🔐 より安全なデプロイ（推奨）

APIキーをより安全に管理するため、GitHub Actionsを使った自動デプロイを推奨します。

### GitHub Secretsの設定

1. GitHubリポジトリの `Settings` > `Secrets and variables` > `Actions` を開く
2. `New repository secret` をクリック
3. 以下のSecretを追加：
   - `GEMINI_API_KEY`: あなたのGemini APIキー
   - `FIREBASE_TOKEN`: `firebase login:ci` で取得したトークン

### GitHub Actionsワークフローの作成

`.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: npm run build
        
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: zatsudan-gacha
```

この方法により、APIキーがローカル環境やリポジトリに残ることなく、安全にデプロイできます。
