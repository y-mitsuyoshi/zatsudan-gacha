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
