import type { Metadata } from 'next';
import DominoCascadeGame from '@/components/sims/domino-cascade/DominoCascadeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import type { GameSeoData } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/domino-cascade',
  name: 'ドミノ・カスケード連鎖伝播ラボ',
  h1: 'ドミノ・カスケード連鎖伝播ラボ｜ドミノの間隔・高さ・伝播速度波形を実験する無料物理シミュレーター',
  description:
    'S字カーブ・ループ交差・ジグザグ・渦巻きスパイラル・三股分岐の5コースで、ドミノの間隔・高さ・摩擦・押し出し・重力を変えながら連鎖波の伝播速度（枚/s・px/s）と所要時間を計測できる無料物理シミュレーター。「同じ配置のままドミノを立たせ直す」ボタンやリアルタイム連鎖伝播グラフを備えています。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理・波動伝播', 'サンドボックス'],
  features: [
    {
      title: '5つのコース形状（S字・ループ・ジグザグ・渦巻き・三股分岐）',
      text: '標準のS字カーブやループ交差に加え、長距離の定常波を観察できる渦巻きスパイラル、1つの起点から3方向へ同時に連鎖が分岐する三股分岐コースをワンタップで切り替えられます。',
    },
    {
      title: 'リアルタイム連鎖伝播グラフ＆所要時間計測',
      text: 'ドミノ番号ごとの空間伝播速度（px/s）と転倒時刻（秒）をリアルタイム波形グラフとしてプロット。初期の押し出しから終端伝播速度（定常波）へ収束する物理現象を視覚化します。',
    },
    {
      title: '「同じ配置のままドミノを立たせ直す」ワンクリック再実験',
      text: '倒し終わったあとも、手動で抜いたり追加したドミノ配置をそのまま維持して一瞬で立たせ直すことが可能。同じ配置に対して高さや重力を変えた比較実験が簡単に行えます。',
    },
    {
      title: '間隔スライダー連動と到達限界ガイド',
      text: '間隔スライダーを動かすとその場でコース上のドミノ間隔が再計算され、現在のドミノの高さで届く範囲は緑、届かず連鎖が途切れる箇所は赤のリンクガイドで即座に表示されます。',
    },
    {
      title: '0.5x・1x・2xの速度切替と1ステップ送り',
      text: '一時停止と1ステップ送りで、隣のドミノに接触する角度（arcsin(gap/height)）の瞬間をコマ送りで詳しく観察できます。',
    },
    {
      title: 'スコアや制限のない純粋な波動伝播ラボ',
      text: 'クリア判定やゲームオーバーはなく、ドミノ連鎖を純粋な物理現象として何度でも実験・観察できます。',
    },
  ],
  steps: [
    {
      title: '5つのコースプリセットから選択',
      text: 'S字カーブ、ループ交差、ジグザグ、渦巻きスパイラル、三股分岐から実験したいコースを選びます。',
    },
    {
      title: '間隔・高さ・重力を調整して到達ガイドを確認',
      text: 'スライダーで間隔やドミノの高さを変更し、緑色の到達ガイド（連鎖可能）と赤色ガイド（間隔過大）の境界を確かめます。',
    },
    {
      title: '「連鎖スタート」で伝播速度と波形を計測',
      text: '先頭のドミノを倒し、枚/秒・px/秒の伝播速度と連鎖伝播グラフの推移を観察します。',
    },
    {
      title: '「同じ配置のまま立たせ直す」で条件比較',
      text: '立たせ直しボタンを押して摩擦や重力を変更し、完走タイムがどう変わるか比較実験します。',
    },
  ],
  faqs: [
    {
      q: 'ドミノの伝播速度はどうやって決まりますか？',
      a: 'ドミノの高さ、隣との間隔、重力加速度、摩擦係数によって決まります。最初の数枚は押し出し力（初速）の影響を受けますが、その後は重力による回転トルクと衝突時の運動量伝達が釣り合う固有の終端伝播速度（定常波）に収束します。',
    },
    {
      q: '一度倒したドミノを同じ並びのままもう一度倒せますか？',
      a: 'はい。「同じ配置のままドミノを立たせ直す」ボタンを押すと、手動で間引いたり追加した配置を保ったまま全ドミノが直立状態に戻ります。',
    },
    {
      q: '三股分岐コースでは何が観察できますか？',
      a: '左端の1本の幹から中央・上・下の3ルートへ同時に連鎖波が分岐し、直線ルートとカーブルートでの伝播タイミングの違いを同時に比較できます。',
    },
    {
      q: '採点やゲームオーバーはありますか？',
      a: 'ありません。純粋にドミノの連鎖伝播と物理パラメータの関係を観察するシミュレーターです。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: 'シミュレーションやミニゲームをまとめて探す' },
    { href: '/ball-multiply', label: 'ボール分裂・増殖時間アナライザー', description: '1個から何秒で増えるか計測する指数増殖ラボ' },
    { href: '/gravity-orbit', label: '重力オービット・軌道実験ラボ', description: 'スイングバイとケプラー軌道を試す物理シミュレーター' },
    { href: '/sand-flow', label: 'サンド・フロー粉体流ラボ', description: '自動ノズルと安息角を観察する落下砂シミュレーター' },
    { href: '/bubble-merge', label: 'バブル・マージ液滴合体ラボ', description: '表面張力と泡サイズ分布を観察する合体ラボ' },
  ],
};

const TITLE = 'ドミノ・カスケード連鎖伝播ラボ｜間隔と物理を試せる無料ドミノシミュレーター';

export const metadata: Metadata = {
  title: TITLE,
  description: game.description,
  keywords: [
    'ドミノ・カスケード',
    'ドミノシミュレーター',
    'ドミノ倒し 物理',
    '連鎖伝播速度 シミュレーション',
    '物理シミュレーション',
    'ブラウザシミュレーター',
    '無料シミュレーション',
    'ドミノ 物理',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: TITLE,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function DominoCascadePage() {
  return (
    <main className="bg-[#12100d]">
      <h1 className="sr-only">{game.h1}</h1>
      <DominoCascadeGame />
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
