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
  h1: 'バブル・マージ・ラボ｜液滴合体・表面張力・サイズ分布ヒストグラムを観察できる無料ブラウザ物理実験室',
  description:
    '標準重力沈降・無重力（宇宙空間の液滴合体）・浮力上昇（シャンパン・炭酸泡）・中心渦流アトラクターの4種類の物理環境プリセットと、超音波ショック（撹拌ウェーブ）を搭載した液滴合体シミュレーター。Level 1〜7の個数・面積（体積）シェアを示すリアルタイム泡サイズ分布ヒストグラム、最大泡半径、合体連鎖レート（回/秒）、経過時間をライブ計測できます。スコアやゲームオーバーはなく、表面張力と合体ダイナミクスを観察する純粋な物理ラボです。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理サンドボックス', '流体・表面張力実験'],
  features: [
    {
      title: '4種類の物理環境プリセット（重力・無重力・浮力・中心渦流）',
      text: '「標準重力沈降」「無重力（宇宙空間の液滴合体）」「浮力上昇（シャンパン・炭酸泡）」「中心渦流アトラクター」をワンタップで切り替え可能。環境に応じた液滴の集まり方と合体連鎖の違いを比較できます。',
    },
    {
      title: 'リアルタイム泡サイズ分布ヒストグラム（Level 1〜7）',
      text: 'サイズ階層 Level 1（14px）から Level 7（74px）までの現在の個数と、タンク内の総面積に対する占有シェア（%）をリアルタイムのヒストグラムで可視化します。',
    },
    {
      title: '超音波ショック（撹拌ウェーブ）で連鎖合体を誘発',
      text: '停滞した液滴群にタンク中心から放射状のインパルス（超音波ショック）を与え、一気に撹拌して連続合体（コアレッセンス）を引き起こすことができます。',
    },
    {
      title: '表面張力と毛細管引力のリアルタイム制御',
      text: '表面張力スライダーを上げると、同サイズの泡同士がわずかに離れていても毛細管引力によって引き寄せられ、滑らかに融合する様子を観察できます。',
    },
    {
      title: '合体連鎖レート（回/秒）・最大半径・経過時間テレメトリ',
      text: '直近の合体頻度を示す合体連鎖レート（回/秒）、累計合体数、最大半径、平均半径、経過時間をリアルタイム表示。スコアやゲームオーバーなしで物理計測に集中できます。',
    },
    {
      title: 'タップ・ドラッグ注入＆コマ送り観察',
      text: 'キャンバスをタップ・ドラッグして任意の場所に泡を注入可能。一時停止と1ステップ送りを使えば、2つの泡が融合して面積保存則に従い1段階大きくなる瞬間を精密に観察できます。',
    },
  ],
  steps: [
    {
      title: '4つの物理環境プリセットから選ぶ',
      text: '「標準重力沈降」「無重力（宇宙液滴）」「浮力上昇（炭酸泡）」「中心渦流アトラクター」のいずれかを選択し、液滴がどのように運動・集合するかを観察します。',
    },
    {
      title: '超音波ショックやドラッグで泡を撹拌・追加',
      text: '「超音波ショック（撹拌ウェーブ）」ボタンを押すか、キャンバス上をドラッグして泡を追加・撹拌し、同サイズの泡同士を接触させます。',
    },
    {
      title: 'サイズ分布ヒストグラムの推移を見る',
      text: '小さな泡（Level 1〜3）が合体を繰り返して大きな泡（Level 5〜7）へと成長し、面積シェアが上位レベルへシフトしていく様子をヒストグラムで確認します。',
    },
    {
      title: '表面張力や弾性を変えて再実験',
      text: '表面張力や反発係数、重力加速度のスライダーを動かし、合体連鎖レート（回/秒）がどう変化するかを比較実験します。',
    },
  ],
  faqs: [
    {
      q: 'バブル・マージ・ラボは無料で使えますか？',
      a: 'はい。ブラウザで開くだけで無料で利用できます。ダウンロードや会員登録は不要です。',
    },
    {
      q: '4つの物理環境プリセットでは何が違いますか？',
      a: '「標準重力沈降」では底面に泡が堆積し、「無重力」では宇宙空間の液滴のように浮遊しながら表面張力で合体します。「浮力上昇」では炭酸飲料の泡のように天井へ浮かび上がり、「中心渦流」では渦の中心へ引き寄せられながら高密度に合体します。',
    },
    {
      q: 'スコアやゲームオーバーはありますか？',
      a: 'ありません。得点やコンボ、危険ライン、ゲームオーバー画面はなく、液滴合体の物理挙動とサイズ分布ヒストグラムを観察するシミュレーターです。',
    },
    {
      q: '超音波ショックボタンとは何ですか？',
      a: 'タンク内のすべての泡に放射状の撹拌インパルスを与える機能です。同じサイズの泡同士が離れた場所で静止しているときに押すと、一斉に衝突・合体連鎖が起きます。',
    },
    {
      q: 'どんな統計・テレメトリを確認できますか？',
      a: 'Level 1〜7の個数と面積シェアを示すサイズ分布ヒストグラムに加え、現在の泡数、合体連鎖レート（回/秒）、最大半径、平均半径、衝突回数、経過時間をリアルタイム表示します。',
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
