import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import { BubbleMergeGame } from '@/components/sims/bubble-merge/BubbleMergeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/bubble-merge',
  name: 'バブル・マージ',
  h1: 'バブル・マージ｜泡をくっつけて大きくする無料ブラウザパズル',
  description:
    '落ちてくる泡を同じサイズ同士でくっつけ、どんどん大きくして弾けさせる無料ブラウザパズルゲーム。左右に狙いを定めてタップするだけの簡単操作で、ネクストバブルの先読み、連鎖コンボ、危険ライン、スコアとベスト記録を楽しめます。',
  image: '/ogp.png',
  genre: ['パズル', 'シミュレーション', 'カジュアル'],
  features: [
    {
      title: 'タップで落として同サイズを合体',
      text: '左右にドラッグして落とす位置を決め、タップするだけで泡が落下。同じサイズの泡が触れるとひとつ大きな泡へ合体し、得点とポップ演出が発生します。',
    },
    {
      title: '連鎖で伸びるコンボ倍率',
      text: '短い時間に連続で合体させるほどコンボがつながり、スコア倍率が上昇。大きな泡をまとめて作り、一気に連鎖させると高得点を狙えます。',
    },
    {
      title: 'ネクストバブルを先読みできる',
      text: '次に落とす泡のサイズと色を常にプレビュー表示。今の泡と次の泡を見比べながら、合体しやすい位置へ計画的に積み上げられます。',
    },
    {
      title: '迫る危険ラインとゲームオーバー',
      text: '泡が赤い危険ラインを超えたまま一定時間経過するとゲームオーバー。積み上がるほど緊張感が増し、ぎりぎりのライン管理が勝負を分けます。',
    },
    {
      title: '軽快な円形物理とポップ演出',
      text: '泡は重力で落ち、壁や床、ほかの泡とやわらかく衝突しながら転がります。合体時にはしぶきのようなパーティクルと波紋が広がり、爽快感を演出します。',
    },
    {
      title: '390pxでも快適なブラウザ設計',
      text: 'スマートフォン幅でも遊びやすい縦長レイアウトと大きなタップ判定を採用。devicePixelRatioに対応した高精細キャンバスと、スクロールを防ぐタッチ操作で快適に遊べます。',
    },
  ],
  steps: [
    {
      title: '左右にドラッグして狙いを決める',
      text: 'ゲーム画面を押したまま左右に動かすと、落下位置のガイドと現在の泡が移動します。壁際までしっかり狙えるので、端の隙間も埋められます。',
    },
    {
      title: 'タップして泡を落とす',
      text: '狙いが決まったら指を離して落下。泡は重力に従って落ち、床やほかの泡の上に積み重なります。連続で落とすとテンポよく積み上がります。',
    },
    {
      title: '同サイズの泡をくっつける',
      text: '同じサイズの泡が触れると、より大きな泡に合体します。連続で合体させるとコンボとスコア倍率が上がり、最大サイズの泡は大きく弾けて消えます。',
    },
    {
      title: '危険ラインを超えないように高得点へ',
      text: '泡が赤い危険ラインを超えたままになると危険度が上昇し、限界に達するとゲームオーバー。大きな泡を効率よく合体させて、限界までスコアを伸ばしましょう。',
    },
  ],
  faqs: [
    {
      q: 'バブル・マージは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で遊べます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。画面を左右にドラッグして狙いを定め、指を離すだけで泡を落とせます。390px幅の画面でも遊びやすいレイアウトとタップ判定に調整しています。',
    },
    {
      q: '高得点を出すコツはありますか？',
      a: '同じサイズの泡を隣り合わせに置き、連続で合体させてコンボをつなぐのがコツです。ネクストバブルの色とサイズを確認し、次に合体しやすい位置へ先読みして落としましょう。',
    },
    {
      q: 'ゲームオーバーになる条件は何ですか？',
      a: '泡が赤い危険ラインを超えた状態が一定時間続くとゲームオーバーになります。ライン付近に泡が残らないよう、大きな泡を作って早めに弾けさせましょう。',
    },
    {
      q: 'ベストスコアは保存されますか？',
      a: 'はい。自己ベストはブラウザのlocalStorageに保存され、ヘッダーとリザルト画面に表示されます。リセットボタンでいつでも最初から挑戦できます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'パズルやシミュレーションをまとめて探す' },
    { href: '/ball-multiply', label: 'ボールマルチプライ', description: 'ボールを増やして駆け抜けるアクションゲーム' },
    { href: '/sand-flow', label: 'サンドフロー', description: '砂の流れを描いて楽しむシミュレーション' },
    { href: '/tools', label: '無料ツール一覧', description: '計算や変換に使える便利ツールを探す' },
  ],
};

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${APP_URL}${game.slug}#webpage`,
  url: `${APP_URL}${game.slug}`,
  name: game.h1,
  description: game.description,
  inLanguage: 'ja-JP',
  isPartOf: { '@id': `${APP_URL}/#website` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${APP_URL}${game.image}`,
  },
};

const pageTitle = 'バブル・マージ';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'puzzle',
  keywords: [
    'バブル・マージ',
    'バブルマージ',
    '泡 合体 ゲーム',
    'マージパズル',
    '落ち物パズル 無料',
    'ブラウザゲーム 無料',
    '物理シミュレーション',
    'スマホ ミニゲーム',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: pageTitle,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function BubbleMergePage() {
  return (
    <main className="bg-[#06111f]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <BubbleMergeGame />
      <SeoContentSection
        variant="dark"
        eyebrow="GAME GUIDE"
        title={`${game.name}の特徴と遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
