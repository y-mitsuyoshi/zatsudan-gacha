import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import { BallMultiplyGame } from '@/components/sims/ball-multiply/BallMultiplyGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/ball-multiply',
  name: 'ボール分裂・増殖時間アナライザー',
  h1: 'ボール分裂・増殖時間アナライザー｜1個のボールが何秒で10個・50個・100個に増えるか計測する無料物理シミュレーター',
  description:
    '1個のシードボールがピン衝突や×2・×3分裂ゲートを通過してどのくらいの時間で10個・50個・100個・上限飽和まで増殖するかを0.01秒単位でリアルタイム計測する物理・数学シミュレーションラボ。実効倍増時間（Doubling Time）、ロジスティック増殖曲線グラフ、ゴルトンボード（正規分布ヒストグラム）を備えています。',
  image: '/ogp.png',
  genre: ['物理シミュレーション', '数学・指数増殖ラボ', 'サンドボックス'],
  features: [
    {
      title: '1個から何秒で増えるか計測する増殖タイマー',
      text: '「1個から実験スタート」ボタンを押すと、1個の種ボールから10個・50個・100個・上限飽和に到達するまでの所要秒数と、ボールが2倍になる平均秒数（実効倍増時間 τ）を自動計測します。',
    },
    {
      title: '×2・×3 分裂ゲート階層で指数爆発を視覚化',
      text: '通過するたびにボールが2倍・3倍に分裂するゲート階層モードを搭載。1→2→4→8→16→32→64→128→256と指数関数的にボールが増えていく様子を直感的に観察できます。',
    },
    {
      title: 'ゴルトンボード（二項分布・正規分布ヒストグラム）',
      text: 'ピンに当たって左右に振り分けられたボールが底面11個のコレクタービンに積み上がり、リアルタイムに釣鐘型の正規分布（ガウス分布）ヒストグラムを形成します。',
    },
    {
      title: 'リアルタイム増殖曲線グラフとマイルストーン表示',
      text: '縦軸にボール数、横軸に経過秒数をとった増殖曲線を0.2秒刻みでプロット。指数関数的な立ち上がりから環境収容力（上限ボール数）によるロジスティック飽和への遷移を確認できます。',
    },
    {
      title: '底面ワープ循環と物理パラメータのライブ調整',
      text: '底面に到達したボールを上へ戻して1個の種ボールだけで上限まで増殖させる「底面ワープ循環」トグルや、重力・ピン段数・分裂確率・反発係数スライダーを自由に調整できます。',
    },
    {
      title: 'スコアやゲームオーバーのない純粋な増殖実験室',
      text: 'ノルマや制限時間はなく、条件を変えながら「どのパラメータ配置が最も速く100個に達するか」を何度でも比較実験できます。',
    },
  ],
  steps: [
    {
      title: '実験装置（分裂ゲート・ピン・ゴルトン・ファンネル）を選ぶ',
      text: '上部の4つの装置プリセットから観察したい分裂構造を選択します。',
    },
    {
      title: '「1個から実験スタート」で倍増時間を計測',
      text: 'ボタンを押すとボールが1個だけ投入され、10個・50個・100個・上限到達までの秒数がリアルタイムに記録されます。',
    },
    {
      title: '分裂確率や重力を変えて到達タイムを比較',
      text: '分裂確率やピン段数、重力をスライダーで変更し、倍増時間 τ（秒/倍）や増殖曲線の傾きがどう変化するか比較します。',
    },
    {
      title: 'タップ追投入や一時停止・1ステップで詳細観察',
      text: '画面タップで任意の場所からボールを追加投入したり、一時停止・1ステップ送りで分裂の瞬間を観察できます。',
    },
  ],
  faqs: [
    {
      q: '1個のボールだけで本当に100個や256個まで増えますか？',
      a: 'はい。「底面ワープ循環」が初期状態でONになっているため、底に落ちたボールが再び上部へ循環し、1個の種ボールから10個・50個・100個・上限（256個など）に達するまでの正確な増殖時間を計測できます。',
    },
    {
      q: '実効倍増時間（τ）とは何ですか？',
      a: 'ボールの数が2倍になるのにかかった平均秒数（τ = t × ln(2) / ln(N)）です。この値が小さいほど、指数関数的な増殖スピードが速いことを意味します。',
    },
    {
      q: 'ゴルトンボードモードでは何を観察できますか？',
      a: 'ピンに衝突するたびに左右へランダムに跳ねたボールが底面の11個のビンに集まり、中央が高く両端が低い二項分布（正規分布）のヒストグラムが自然に形成される統計現象を観察できます。',
    },
    {
      q: 'スコアやクリア条件はありますか？',
      a: 'ありません。純粋にボールの分裂速度や増殖曲線、確率分布を実験・観察するためのシミュレーターです。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: 'シミュレーションやパズルをまとめて探す' },
    { href: '/gravity-orbit', label: '重力オービット・軌道実験ラボ', description: 'スイングバイとケプラー軌道を実験する重力ラボ' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード伝播ラボ', description: 'ドミノ連鎖の伝播速度と波形を計測する実験室' },
    { href: '/sand-flow', label: 'サンド・フロー粉体流ラボ', description: '自動ノズルと安息角を観察する落下砂シミュレーター' },
    { href: '/bubble-merge', label: 'バブル・マージ液滴合体ラボ', description: '表面張力と泡サイズ分布を観察する合体ラボ' },
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

const pageTitle = 'ボール分裂・増殖時間アナライザー｜指数増殖と倍増時間を計測する物理シミュレーター';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    'ボール分裂 シミュレーター',
    '増殖ボール シミュレーション',
    '倍増時間 指数関数 シミュレーター',
    'ゴルトンボード シミュレーター',
    '物理サンドボックス',
    'ブラウザ シミュレーター',
    '分裂ゲート シミュレーション',
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
