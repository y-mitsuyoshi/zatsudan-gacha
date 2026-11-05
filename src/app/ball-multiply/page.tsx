import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import { BallMultiplyGame } from '@/components/sims/ball-multiply/BallMultiplyGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/ball-multiply',
  name: '増殖ボール・カスケード',
  h1: '増殖ボール・カスケード｜ピンで分裂して連鎖する無料ブラウザ物理ゲーム',
  description:
    'ピンに当たるたびにボールが分裂して増えていく無料ブラウザ物理ゲーム。ドラッグで落とす位置を決め、7つの回収ゾーンへボールを導いてスコアとコンボを伸ばします。制限時間90秒と14個のドロップで自己ベストに挑戦できます。',
  image: '/ogp.png',
  genre: ['物理シミュレーション', 'カジュアル', 'アクション'],
  features: [
    {
      title: 'ドラッグ＆ドロップで狙いを定める',
      text: '画面を押したまま左右にドラッグすると、ボールを落とす位置が決まります。指を離した瞬間にドロップされ、狙ったゾーンへ向かって落下します。',
    },
    {
      title: 'ピン衝突でボールが分裂',
      text: 'ボールはピンに当たるたびに分裂し、画面内のボールがどんどん増えていきます。分裂したボールはそれぞれ別の軌道を描き、カスケードのように降り注ぎます。',
    },
    {
      title: '7つの回収ゾーンとコンボ倍率',
      text: '下部には40点から320点までの7つの回収ゾーンを配置。連続でボールを回収するとコンボが繋がり、最大5倍までスコア倍率が上昇します。',
    },
    {
      title: 'ゴールデンピンの追加分裂',
      text: '金色に光るピンに当たると25点を獲得し、そのボールの分裂回数が1回増加。狙って通すほどボールの数と得点が伸びる攻略要素です。',
    },
    {
      title: '制限時間と限られたドロップ数',
      text: 'プレイ時間は90秒、ドロップできるボールは14個。残り時間と残りドロップを確認しながら、増殖したボールを効率よく回収しましょう。',
    },
    {
      title: '390px幅でも遊べる高解像度Canvas',
      text: 'スマートフォンの390px幅でも収まるレスポンシブ設計。devicePixelRatioに合わせた高解像度描画と、touch-action:noneの快適なポインター操作に対応しています。',
    },
  ],
  steps: [
    {
      title: 'ゲームスタートを押す',
      text: 'タイトル画面の「ゲームスタート」を押すと、90秒のタイマーと14個のドロップでプレイが始まります。',
    },
    {
      title: 'ドラッグして落とす位置を決める',
      text: 'ゲーム画面を押したまま左右に動かすと、上部のランチャーが移動します。狙いのゾーンに合わせて位置を調整しましょう。',
    },
    {
      title: '指を離してドロップ',
      text: '位置が決まったら指を離してボールを投下。ボールはピンに当たるたびに分裂しながら落下し、回収ゾーンに入ると得点が加算されます。',
    },
    {
      title: 'コンボを繋いでリザルトへ',
      text: 'ボールを連続で回収してコンボ倍率を上げ、制限時間内にできるだけ多くの得点を稼ぎます。終了後はスコアと最大コンボを確認できます。',
    },
  ],
  faqs: [
    {
      q: '増殖ボール・カスケードは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で遊べます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。画面をドラッグして位置を決め、指を離すだけでドロップできます。390px幅のスマートフォンでも遊びやすいようにレイアウトを調整しています。',
    },
    {
      q: 'ボールはどのように分裂しますか？',
      a: 'ボールがピンに当たるたびに分裂し、分裂回数は最大3回です。金色のピンに当たると分裂回数が1回増えるため、さらに多くのボールを増やせます。',
    },
    {
      q: '高スコアを狙うコツはありますか？',
      a: '中央の320点ゾーンを狙いつつ、回収が途切れないようにコンボを繋ぐのがコツです。ゴールデンピンに当てて分裂を増やし、ボールをまとめて回収しましょう。',
    },
    {
      q: '1回のプレイ時間はどれくらいですか？',
      a: '1プレイ90秒です。ドロップできるボールは14個で、時間切れまたは全ボール回収でリザルト画面に移ります。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやパズルをまとめて探す' },
    { href: '/bubble-merge', label: 'バブルマージ', description: '泡をくっつけて大きくするマージパズル' },
    { href: '/gravity-orbit', label: '重力オービット', description: '重力スリングショットで星を巡るシミュレーション' },
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

const pageTitle = '増殖ボール・カスケード';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '増殖ボール・カスケード',
    'ボール 分裂 ゲーム',
    'カスケード ゲーム',
    'ピンボール 無料',
    '物理シミュレーション ゲーム',
    'ブラウザゲーム 無料',
    'スマホ 無料ゲーム',
    'カジュアルゲーム',
  ],
  alternates: {
    canonical: '/ball-multiply',
  },
  openGraph: {
    title: pageTitle,
    description: game.description,
    url: `${APP_URL}/ball-multiply`,
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

export default function BallMultiplyPage() {
  return (
    <main className="bg-[#03110f]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <BallMultiplyGame />
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
