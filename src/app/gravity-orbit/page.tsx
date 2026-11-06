import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import GravityOrbitGame from '@/components/sims/gravity-orbit/GravityOrbitGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/gravity-orbit',
  name: '重力オービット・軌道実験ラボ',
  h1: '重力オービット・軌道実験ラボ｜スイングバイや周回軌道を直感的に実験できる無料ブラウザ重力シミュレーター',
  description:
    'ワンタップ軌道実験プリセット（星の背後へスイングバイ命中・安定周回・扇状11機同時スプレッド・連星8の字軌道）や、恒星・惑星のドラッグ移動、ケプラー第2法則のリアルタイム速度・距離グラフを備えた無料ブラウザ重力シミュレーター。発射前に予測軌道ラインが常時表示され、星の背後観測センサーでスイングバイの回り込み角度と最接近距離を定量的に観測できます。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理サンドボックス', '天文・軌道力学'],
  features: [
    {
      title: '4つのワンタップ軌道実験プリセット',
      text: '「星の背後へスイングバイ命中」「安定周回（円・楕円軌道）」「扇状11機スプレッド発射」「連星8の字・カオス三体実験」をワンタップで即座に再現。複雑な角度調整なしでも美しい軌道力学をすぐに観察できます。',
    },
    {
      title: '星の背後スイングバイ観測センサー＆常時予測軌道ライン',
      text: '恒星の背後エリアにスイングバイ観測センサーリングを配置（ON/OFF切替可）。発射前から予測軌道が点線で常時表示され、星の背後に回り込むコースに入ると緑色にハイライトされます。',
    },
    {
      title: '恒星・惑星の直接ドラッグ移動と質量・重力スライダー',
      text: 'キャンバス上の恒星や惑星を直接ドラッグして配置をリアルタイムに変更可能。飛行中の探査機の軌道がその場で変形する様子を観察できます。',
    },
    {
      title: 'ケプラー第2法則を可視化する速度・距離リアルタイムグラフ',
      text: '探査機の軌道速度（u/s）と最寄り天体までの距離（u）、最大偏向角、二体近似による推定公転周期をリアルタイム波形グラフとして記録。近点での加速と遠点での減速が一目でわかります。',
    },
    {
      title: '最大12機の同時軌道比較と光るネオントレイル',
      text: '扇状同時発射や連続発射で最大12機の探査機を同時に飛ばし、初期角度のわずかな違いが重力井戸によって大きく広がるカオス性やスイングバイ効果を色分けされたトレイルで比較できます。',
    },
    {
      title: 'スコアやゲームオーバーのない純粋な天文物理ラボ',
      text: 'ステージ制限や失敗判定はなく、0.5倍・1倍・2倍の速度切替や一時停止・1ステップ送りを使って心ゆくまで重力軌道を実験できます。',
    },
  ],
  steps: [
    {
      title: 'ワンタップ軌道実験プリセットを試す',
      text: 'まずは画面上部の「星の背後へスイングバイ命中」や「扇状11機スプレッド発射」をタップして、重力スイングバイや周回軌道の動きを観察します。',
    },
    {
      title: '恒星や惑星をドラッグして重力場を変形',
      text: 'キャンバス上の恒星や惑星を指やマウスでドラッグして動かし、周回中の軌道や予測ラインがどう変化するか試します。',
    },
    {
      title: '予測ラインを見ながら自由な角度・速度で発射',
      text: 'スライダーまたは画面ドラッグで発射角度と速度を調整。星の背後のセンサーリングに予測ラインが重なる角度を見つけて探査機を打ち出します。',
    },
    {
      title: '速度・距離グラフでケプラー運動を分析',
      text: 'サイドパネルのリアルタイム波形グラフで、天体に近づくほど速度が上がり、離れるほど速度が落ちるケプラー運動の法則を確認します。',
    },
  ],
  faqs: [
    {
      q: '星の後ろ（背後エリア）に探査機を回り込ませるにはどうすればいいですか？',
      a: '上部の「星の背後へスイングバイ命中」ボタンをタップすると、恒星の重力で大きく曲がって背後センサー（緑のリング）の中央を通過する実証済み軌道（速度130 u/s・角度-59°、および速度140 u/s・角度-146°）が即座に発射されます。また、常時表示される点線の予測軌道を見ながら角度スライダーを動かすと、命中コースに入った瞬間に予測線が緑色に変わります。',
    },
    {
      q: '恒星や惑星の位置を動かすことはできますか？',
      a: 'はい。キャンバス上の恒星や惑星を直接ドラッグすると、リアルタイムに位置を移動できます。探査機が飛行している最中に天体を動かして軌道の変化を観察することも可能です。',
    },
    {
      q: 'スコアやクリア条件、ゲームオーバーはありますか？',
      a: 'ありません。純粋に重力場と軌道力学を実験・観察するための物理シミュレーターです。背後センサーリングもON/OFF自由な観測用ターゲットとして機能します。',
    },
    {
      q: 'ケプラーテレメトリのグラフは何を表していますか？',
      a: '実線（シアン）が探査機の速度、破線（アンバー）が最寄り天体表面までの距離を表しています。天体に最接近する近点で速度が最大になり、遠点で最小になるケプラーの第2法則をリアルタイムに確認できます。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: '物理シミュレーションやミニゲームをまとめて探す' },
    { href: '/ball-multiply', label: 'ボール分裂・増殖時間アナライザー', description: '1個から何秒で増えるか計測する指数増殖ラボ' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード伝播ラボ', description: 'ドミノ連鎖の伝播速度と波形を観察する物理実験室' },
    { href: '/sand-flow', label: 'サンド・フロー粉体流ラボ', description: '自動ノズルと安息角を観察する落下砂シミュレーター' },
    { href: '/bubble-merge', label: 'バブル・マージ液滴合体ラボ', description: '表面張力と泡サイズ分布ヒストグラムを観察する実験室' },
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

const pageTitle = `${game.name}｜スイングバイと軌道を実験する無料重力シミュレーター`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    '重力オービット',
    '重力シミュレーター',
    '軌道シミュレーター',
    'スイングバイ シミュレーション',
    '物理サンドボックス',
    'ブラウザ シミュレーション',
    'ケプラーの法則 シミュレーター',
    '三体問題 シミュレーター',
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

export default function GravityOrbitPage() {
  return (
    <main className="bg-[#05070f]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <GravityOrbitGame />
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
