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

**重要**: ビルド時に`.env.local`の環境変数が静的ファイルに埋め込まれます。

```bash
pnpm run build
```

このコマンドにより、`out`ディレクトリにデプロイ用のファイルが生成されます。

### 4. デプロイの実行

最後に、Firebaseにデプロイします。

```bash
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
