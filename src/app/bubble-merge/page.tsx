import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import { BubbleMergeGame } from '@/components/sims/bubble-merge/BubbleMergeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/bubble-merge',
  name: 'バブル・マージ・ラボ',
  h1: 'バブル・マージ・ラボ｜泡の合体と物理を観察できる無料ブラウザシミュレーター',
  description:
    '重力・表面張力・泡のサイズ範囲・発生量・弾性・泡の数を自由に調整し、同サイズの泡が合体していく様子を観察できる無料ブラウザシミュレーター。タップやドラッグで泡を追加し、自動生成・一時停止・1ステップ・速度変更・リセットを使いながら、泡の数・合体回数・最大半径・平均半径・衝突回数をライブ表示で確認できます。スコアやゲームオーバーはなく、物理パラメータを試す砂場として楽しめます。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理サンドボックス', 'カジュアル'],
  features: [
    {
      title: '重力と弾性をリアルタイム調整',
      text: '重力スライダーは0から1800まで、弾性は0から90%まで調整可能。無重力の浮遊状態から、よく弾む泡の落下まで、その場で物理挙動が変化します。',
    },
    {
      title: '表面張力で合体しやすさを制御',
      text: '表面張力スライダーは、同サイズの泡が合体する距離の余裕を決めます。低くすれば接触が必要になり、高くすれば少し離れていても引き寄せられて合体します。',
    },
    {
      title: '泡のサイズ範囲と発生量を設定',
      text: '最小サイズと最大サイズの範囲から泡が選ばれ、発生レートで自動生成の頻度を調整できます。サイズの階層は面積が保存されるよう設計され、合体するたびに一段大きくなります。',
    },
    {
      title: 'タップ・ドラッグで自由に泡を追加',
      text: 'キャンバスをタップすると泡が出現し、ドラッグすると移動先に連続で泡を追加できます。自動生成をオフにすれば、自分の手で泡を配置する静的な実験も可能です。',
    },
    {
      title: '自動生成・一時停止・1ステップ',
      text: '自動生成のオンオフ、一時停止と再生、1ステップ送りを切り替えられます。泡を追加してから一時停止し、1ステップずつ動かして合体の瞬間を観察できます。',
    },
    {
      title: 'スコアなしのライブ統計',
      text: '泡の数、合体回数、最大半径、平均半径、衝突回数を常時表示。得点やコンボ、危険ライン、ゲームオーバーはなく、泡の振る舞いを数値で観察することに集中できます。',
    },
  ],
  steps: [
    {
      title: 'スライダーで環境を整える',
      text: '重力、表面張力、泡のサイズ範囲、発生レート、泡の数、弾性、シミュレーション速度を好みに調整します。最初は初期設定のままでも動きを観察できます。',
    },
    {
      title: 'タップまたはドラッグで泡を追加',
      text: 'キャンバスをタップするとその位置に泡が出現します。ドラッグすると指の軌跡に沿って泡が追加され、自動生成を待たずに自由な配置を試せます。',
    },
    {
      title: '同サイズの泡を合体させる',
      text: '同じサイズの泡が表面張力の範囲で触れると、ひとつ大きな泡へ合体します。最大サイズまで育った泡は、さらに同サイズと合体すると弾けて消えます。',
    },
    {
      title: '一時停止とステップで観察',
      text: '一時停止で動きを止め、1ステップで少しずつ進めると合体や衝突の瞬間を確認できます。泡の数や最大半径、衝突回数の変化を統計で見比べてください。',
    },
  ],
  faqs: [
    {
      q: 'バブル・マージ・ラボは無料で使えますか？',
      a: 'はい。ブラウザで開くだけで無料で利用できます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも操作できますか？',
      a: 'はい。スマートフォンではキャンバスをタップまたはドラッグして泡を追加します。390px幅でも統計とスライダーが見やすい縦長レイアウトに調整しています。',
    },
    {
      q: 'スコアやゲームオーバーはありますか？',
      a: 'ありません。得点やコンボ、危険ライン、リザルト画面はなく、泡の物理挙動とライブ統計を観察するシミュレーターです。',
    },
    {
      q: '泡が増えすぎることはありませんか？',
      a: '泡の数スライダーで目標数を決められ、自動生成は目標数を超えないように動きます。手動追加を含めた上限は120個で、最大サイズの泡は合体時に弾けて消えるため、無限に増え続けません。',
    },
    {
      q: 'どんな統計を確認できますか？',
      a: '現在の泡の数、合体回数、最大半径、平均半径、衝突回数をリアルタイムで表示します。スコアの代わりに、泡の状態と物理挙動を数値で確認できます。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: '物理サンドボックスやミニゲームをまとめて探す' },
    { href: '/gravity-orbit', label: '重力オービット', description: '重力と軌道を調整して楽しむシミュレーション' },
    { href: '/sand-flow', label: 'サンドフロー', description: '砂の流れを描いて観察するシミュレーション' },
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

const pageTitle = 'バブル・マージ・ラボ｜泡の合体を観察する物理シミュレーター';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    'バブル・マージ・ラボ',
    '泡 合体 シミュレーター',
    '泡 物理 シミュレーション',
    '表面張力 シミュレーター',
    '重力 サンドボックス',
    'ブラウザ シミュレーター 無料',
    '物理シミュレーション',
    'スマホ シミュレーター',
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
        eyebrow="SIMULATION GUIDE"
        title={`${game.name}の特徴と使い方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料シミュレーション一覧', href: '/games#simulation-games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
