import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import GravityOrbitGame from '@/components/sims/gravity-orbit/GravityOrbitGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/gravity-orbit',
  name: '重力オービット・サンドボックス',
  h1: '重力オービット・サンドボックス｜惑星質量と軌道を自由に操る無料ブラウザ重力シミュレーター',
  description:
    'ドラッグで探査機を打ち出し、惑星質量・重力定数・発射速度・角度を変えながら軌道やスリングショットを観察できる無料ブラウザ重力シミュレーター。単星・連星・三体・リングのプリセット星系、恒星の表示切替、光る軌道トレイル、最大12機の探査機、速度・距離・推定公転周期のライブ計測、一時停止・1ステップ・0.5倍/1倍/2倍の速度切替を備えています。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理サンドボックス', '教育'],
  features: [
    {
      title: 'ドラッグで探査機を打ち出して軌道を観察',
      text: '発射台を起点に画面をドラッグして角度を決め、指を離すと探査機が発射されます。発射速度スライダーと組み合わせて、周回軌道やスイングバイ、落下軌道を自由に試せます。',
    },
    {
      title: '惑星質量と重力定数をライブ調整',
      text: '惑星質量は0.2〜2.5倍、重力定数は0.2〜2.0倍で変更可能。スライダーを動かすと重力井戸の深さがその場で変わり、同じ発射条件でも軌道が大きく変化します。',
    },
    {
      title: '4つのプリセット星系と恒星トグル',
      text: 'ソロ・スター、連星、三体、リングの4構成をワンタップで切り替え。恒星の表示と重力をオフにして、重力源がない場合の直線運動と比較できます。',
    },
    {
      title: '複数探査機と色分けされた光るトレイル',
      text: '最大12機の探査機を同時に飛ばし、色ごとのネオントレイルで軌道を比較できます。トレイル長は40〜900ポイントで調整でき、古い探査機は自動で入れ替わります。',
    },
    {
      title: '観測メトリクスで軌道を数値化',
      text: '選択中の探査機の速度、最寄り天体までの距離、二体近似による推定公転周期、アクティブ探査機数、トレイル長をリアルタイム表示。スコアや勝敗のない観測専用の画面です。',
    },
    {
      title: '390px対応の一時停止・ステップ・速度切替',
      text: '0.5倍・1倍・2倍のシミュレーション速度、一時停止と1ステップ送り、リセットを搭載。ポインターイベントとDPR対応Canvasにより、スマートフォンの390px幅でも軽快に操作できます。',
    },
  ],
  steps: [
    {
      title: 'プリセット星系を選ぶ',
      text: 'ソロ・スター、連星、三体、リングから観察したい星系を選択します。切り替えると探査機とトレイルはリセットされます。',
    },
    {
      title: '惑星質量・重力定数・速度を調整',
      text: '惑星質量、重力定数、発射速度、発射角度、トレイル長をスライダーで設定。恒星トグルで中心天体の重力をオン・オフできます。',
    },
    {
      title: 'ドラッグして探査機を発射',
      text: 'キャンバス上でドラッグして発射角度を決め、指を離すと探査機が飛び出します。発射ボタンを使えばスライダーの角度と速度でそのまま打ち出せます。',
    },
    {
      title: '複数の探査機を追加して比較',
      text: '続けて発射すると色の異なる探査機が加わり、最大12機まで同時に観測できます。古い探査機のトレイルはフェードアウトします。',
    },
    {
      title: '一時停止・ステップで軌道を確認',
      text: '一時停止中は1ステップずつ進められ、速度切替で0.5倍から2倍まで変化させられます。リセットで探査機とエフェクトを消して同じ条件からやり直せます。',
    },
  ],
  faqs: [
    {
      q: '重力オービット・サンドボックスは無料で使えますか？',
      a: 'はい。ブラウザで開くだけで無料で利用できます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも操作できますか？',
      a: 'はい。390px幅の画面に対応しており、ドラッグとスライダーで操作できます。Canvasはtouch-action:none、ポインターイベント、DPR対応で、指の動きをそのまま軌道に反映します。',
    },
    {
      q: '探査機は何機まで同時に飛ばせますか？',
      a: '最大12機です。上限を超えると最も古い探査機がトレイルの残像に切り替わり、新しい探査機が追加されます。トレイルは探査機ごとに長さを制限しています。',
    },
    {
      q: 'スコアや勝敗、制限時間はありますか？',
      a: 'ありません。得点・コンボ・ラウンド・発射回数・クリア条件のない重力サンドボックスです。表示されるのは速度、距離、推定公転周期、探査機数、トレイル長などの観測値だけです。',
    },
    {
      q: '推定公転周期はどのように計算していますか？',
      a: '選択中の探査機に最も強く影響している天体との二体近似で、位置と速度から軌道エネルギーを求めています。束縛軌道のときだけ周期を秒単位で表示し、離脱軌道では表示しません。',
    },
    {
      q: 'プリセット星系と恒星トグルの違いは何ですか？',
      a: 'プリセットは惑星や恒星の配置を切り替える機能です。恒星トグルは恒星の表示と重力だけをオン・オフするため、同じ配置で重力源を外したときの動きを比較できます。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: '物理シミュレーションやミニゲームをまとめて探す' },
    { href: '/sand-flow', label: 'サンド・フロー・サンドボックス', description: '重力や風を操る落下砂シミュレーター' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード', description: 'ドミノの連鎖と倒れ方を観察する物理シミュレーション' },
    { href: '/bubble-merge', label: 'バブルマージ', description: '泡の合体と成長を観察するマージシミュレーション' },
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

const pageTitle = `${game.name}｜重力と軌道を自由に試す無料シミュレーター`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    '重力オービット',
    '重力シミュレーター',
    '軌道シミュレーター',
    'スリングショット 物理',
    '物理サンドボックス',
    'ブラウザ シミュレーション',
    '無料 シミュレーター',
    '軌道 観察',
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
