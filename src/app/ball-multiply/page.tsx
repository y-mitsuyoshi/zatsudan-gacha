import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import { BallMultiplyGame } from '@/components/sims/ball-multiply/BallMultiplyGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/ball-multiply',
  name: '増殖ボール・シミュレーター',
  h1: '増殖ボール・シミュレーター｜重力と分裂を調整して観察する無料物理サンドボックス',
  description:
    'ピンに当たると分裂するボールを、重力・ピン段数・分裂確率・反発係数・上限ボール数・自動スポーン・シミュレーション速度の7項目で調整できる無料の物理サンドボックス。タップやドラッグでボールを投入し、増殖と衝突のカスケードをリアルタイムに観察できます。スコアや制限時間はありません。',
  image: '/ogp.png',
  genre: ['物理シミュレーション', 'サンドボックス', 'カジュアル'],
  features: [
    {
      title: 'タップ＆ドラッグでボールを投入',
      text: '画面をタップした位置、またはドラッグして決めた位置からボールを落とせます。指を離すたびに新しいボールが投入され、ピンの間を縫うように落下していきます。',
    },
    {
      title: 'ピン衝突で広がる分裂カスケード',
      text: 'ボールはピンに当たるたびに設定した確率で分裂。分裂したボールはそれぞれ別の軌道を描き、画面全体にカスケードのような増殖の連鎖が広がります。',
    },
    {
      title: '7つのライブパラメータ',
      text: '重力、ピン段数、分裂確率、反発係数、上限ボール数、自動スポーン、シミュレーション速度（0.5x/1x/2x）をスライダーとトグルで変更できます。変更は即座に物理挙動へ反映されます。',
    },
    {
      title: '一時停止・1ステップ・リセット',
      text: 'いつでも一時停止して動きを止め、1ステップずつ進めて衝突の瞬間を確認できます。リセットでボールを消去し、パラメータの初期化で標準設定に戻せます。',
    },
    {
      title: 'スコアなしの観察メトリクス',
      text: '現在のボール数、累計分裂回数、1秒あたりの衝突回数、最大同時ボール数、静止中のボール数をリアルタイム表示。得点やタイマーではなく、物理挙動の変化を数値で観察できます。',
    },
    {
      title: '390px幅対応の高解像度Canvas',
      text: 'スマートフォンの390px幅でも収まる縦長レイアウト。devicePixelRatioに合わせた高解像度描画、touch-action:noneのポインター操作、requestAnimationFrameによる滑らかな描画に対応しています。',
    },
  ],
  steps: [
    {
      title: 'プリセットまたはパラメータを選ぶ',
      text: '標準・高重力・分裂多めのプリセットを選ぶか、スライダーで重力や分裂確率などを調整します。',
    },
    {
      title: 'タップ／ドラッグでボールを投入',
      text: '画面をタップするか、押したまま左右にドラッグして位置を決め、指を離すとボールが落下します。自動スポーンをオンにすれば放置でも観察できます。',
    },
    {
      title: '分裂と衝突のカスケードを観察',
      text: 'ピンに当たって分裂するボールの軌道、衝突回数、静止して排出されるまでの流れを眺めます。一時停止や1ステップで瞬間を確認できます。',
    },
    {
      title: '速度とパラメータを変えて比較',
      text: '0.5xでゆっくり観察したり、2xで一気に増殖させたり、反発係数や上限ボール数を変えて挙動の違いを比較します。',
    },
  ],
  faqs: [
    {
      q: '増殖ボール・シミュレーターは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で利用できます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スコアや制限時間はありますか？',
      a: 'ありません。得点・コンボ・タイマー・勝敗・リザルトはなく、物理パラメータを調整してボールの増殖を観察するサンドボックスです。',
    },
    {
      q: 'スマートフォンでも操作できますか？',
      a: 'はい。画面をタップまたはドラッグしてボールを投入できます。390px幅の画面でもスライダーとトグルを操作しやすいレイアウトにしています。',
    },
    {
      q: '分裂確率と反発係数は何を変えますか？',
      a: '分裂確率はピンに当たったときにボールが分裂する割合です。反発係数はピンや壁、床に当たったときの跳ね返りやすさで、1に近いほどよく弾み、小さいほど減衰します。',
    },
    {
      q: 'ボールが消えるのはなぜですか？',
      a: '床で静止したボールはしばらく観察されたあと自動で排出されます。上限ボール数とあわせて、オブジェクトが無限に増え続けないようにするための仕組みです。',
    },
    {
      q: '自動スポーンとは何ですか？',
      a: '一定間隔で画面内へボールを自動投入するトグルです。オフにするとタップやドラッグで投入したボールだけが落下します。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやパズルをまとめて探す' },
    { href: '/gravity-orbit', label: '重力オービット', description: '重力スリングショットで星を巡るシミュレーション' },
    { href: '/sand-flow', label: 'サンド・フロー', description: '色砂を注いで流れを観察する落下砂シミュレーション' },
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

const pageTitle = '増殖ボール・シミュレーター';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    '増殖ボール・シミュレーター',
    'ボール 分裂 シミュレーション',
    '物理サンドボックス',
    'ピンボール シミュレーター',
    '重力 シミュレーション',
    'ブラウザ シミュレーター',
    'パラメータ 調整',
    '無料 物理シミュレーション',
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
        eyebrow="SIMULATOR GUIDE"
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
