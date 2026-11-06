import type { Metadata } from 'next';
import { SandFlowGame } from '@/components/sims/sand-flow/SandFlowGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import type { GameSeoData } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/sand-flow',
  name: 'サンド・フロー粉体流・安息角ラボ',
  h1: 'サンド・フロー粉体流・安息角ラボ｜自動ノズル・砂時計・ミキサーで観察する無料落下砂シミュレーター',
  description:
    '4色の自動ノズル噴出（オートストリーム）と5種類の粉体実験装置（多段ファネル・砂時計・左右スプリッター・混合ミキサー槽・自由キャンバス）を備えた無料の粉体物理シミュレーター。安息角による砂山の堆積、オリフィス流量、境界混色反応、リアルタイム色別構成比バーと流下移動レート（粒/秒）を観察できます。',
  image: '/ogp.png',
  genre: ['シミュレーション', '粉体物理サンドボックス', 'クリエイティブ'],
  features: [
    {
      title: '4色自動ノズル噴出（オートストリーム）＆底面ドレイン循環',
      text: 'ページを開いた瞬間から上部4基のノズルが朱・金・翠・紫の色砂を自動噴出。底面ドレイン循環と組み合わせることで、手を触れずにいつまでも美しい砂の滝と堆積を眺め続けられます。',
    },
    {
      title: '5つの粉体実験装置プリセット',
      text: '多段ファネル、砂時計（アワーグラス）、左右振り分けスプリッター、交互バッフル混合ミキサー槽、自由キャンバスの5装置をワンタップで切り替えられます。',
    },
    {
      title: 'リアルタイム色別構成比バー＆流速・静止率テレメトリ',
      text: '総粒子数、1秒あたりの流下移動レート（粒/秒）、安息角で堆積した静止率（%）、境界混色粒子数、4色の構成比スタックバーをリアルタイムに計測・表示します。',
    },
    {
      title: '重力・横風・流量のライブ調整と自由な壁ブラシ',
      text: '重力（0〜100%）、横風の向きと強さ、ノズル流量をスライダーで変更可能。さらに壁ブラシと消しゴムでオリフィス幅を狭めたり独自の流路を設計できます。',
    },
    {
      title: '異なる色砂の接触による境界混色反応',
      text: '異なる色の砂が静止状態で接すると、境界層でオレンジやエメラルドなどの混色粒子が生成され、地層のような混合パターンを観察できます。',
    },
    {
      title: 'スコアや制限時間のない純粋な粉体物理ラボ',
      text: '一時停止・1ステップ送り・速度切替（0.5x/1x/2x）を使い、セルオートマトンによる粉体流の挙動を心ゆくまで観察できます。',
    },
  ],
  steps: [
    {
      title: '5つの粉体実験装置プリセットを切り替える',
      text: '多段ファネル、砂時計、スプリッター、混合ミキサー槽、自由キャンバスから装置を選び、4色ノズルからの砂の流れを観察します。',
    },
    {
      title: '重力・横風・流量スライダーで粉体流を変化させる',
      text: '横風を加えて砂の軌道を曲げたり、流量を変えて砂時計のオリフィス詰まり（アーチ効果）や安息角の変化を試します。',
    },
    {
      title: 'ブラシで砂の追加注入や障害物の描画・消去',
      text: 'キャンバスをドラッグして好きな色の砂を注ぎ足したり、壁ブラシで新しい棚や漏斗を描き加えます。',
    },
    {
      title: '色別構成比バーと流下レートで定量観察',
      text: 'サイドパネルの流下移動レート（粒/s）や静止率（%）、色別構成比バーで粉体の定常状態を確認します。',
    },
  ],
  faqs: [
    {
      q: 'マウスや指で押し続けなくても自動で砂が流れますか？',
      a: 'はい。「自動ノズル噴出」が初期状態でONになっているため、上部4箇所のノズルから自動的に4色の砂が降り注ぎます。手動で描きたい場合は自動ノズルをOFFに切り替えられます。',
    },
    {
      q: '砂が満杯になって止まってしまいませんか？',
      a: '「底面ドレイン循環」がONになっていると、底に溜まった砂が少しずつ排出されるため、砂時計やミキサーの流れを永久に観察し続けることができます。底までしっかり積み上げたい場合はOFFに切り替えられます。',
    },
    {
      q: '安息角とは何ですか？',
      a: '砂などの粉体を積み上げたときに、自重で崩れずに保てる斜面の最大角度のことです。自由キャンバスや砂時計の下部で、きれいな円錐状の砂山が形成される様子を観察できます。',
    },
    {
      q: 'スコアやクリア条件はありますか？',
      a: 'ありません。純粋に粉体の流れや堆積、混色を実験・鑑賞するためのサンドボックスです。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: '物理シミュレーションやミニゲームをまとめて探す' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード連鎖伝播ラボ', description: 'ドミノの連鎖波と伝播速度を観察する実験室' },
    { href: '/ball-multiply', label: 'ボール分裂・増殖時間アナライザー', description: '1個から何秒で増えるか計測する指数増殖ラボ' },
    { href: '/gravity-orbit', label: '重力オービット・軌道実験ラボ', description: 'スイングバイとケプラー軌道を試す重力シミュレーター' },
    { href: '/bubble-merge', label: 'バブル・マージ液滴合体ラボ', description: '表面張力と泡サイズ分布を観察する合体ラボ' },
  ],
};

export const metadata: Metadata = {
  title: 'サンド・フロー粉体流・安息角ラボ｜落下砂シミュレーター',
  description: game.description,
  keywords: [
    'サンド・フロー',
    '落下砂シミュレーター',
    '粉体シミュレーション',
    '砂時計 シミュレーター',
    '安息角 シミュレーション',
    'セルオートマトン 砂',
    'ブラウザ シミュレーター',
    '無料 シミュレーション',
  ],
  alternates: {
    canonical: '/sand-flow',
  },
  openGraph: {
    title: 'サンド・フロー粉体流・安息角ラボ｜落下砂シミュレーター',
    description: game.description,
    url: `${APP_URL}/sand-flow`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'サンド・フロー粉体流・安息角ラボ｜落下砂シミュレーター',
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function SandFlowPage() {
  return (
    <main className="bg-[#080b10]">
      <h1 className="sr-only">{game.h1}</h1>
      <SandFlowGame />
      <JsonLd data={buildGameJsonLd(game)} />
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
      />
    </main>
  );
}
