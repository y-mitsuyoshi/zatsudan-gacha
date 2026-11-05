import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import GravityOrbitGame from '@/components/sims/gravity-orbit/GravityOrbitGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/gravity-orbit',
  name: '重力オービット',
  h1: '重力オービット｜重力スリングショットで星を巡る無料ブラウザシミュレーション',
  description:
    'ドラッグで探査機を撃ち出し、惑星の重力で軌道を曲げながら星を集める無料ブラウザシミュレーションゲーム。光る軌道トレイルと着弾予測を頼りに、全6ラウンドの星図を3機の探査機で巡り、コンボとスコアを伸ばします。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理パズル', 'アクション'],
  features: [
    {
      title: 'ドラッグだけで決まる重力スリングショット',
      text: '発射台から指を滑らせて方向とパワーを同時に調整。離した瞬間に探査機が飛び出し、惑星の重力が軌道を大きく曲げます。',
    },
    {
      title: '光る軌道トレイルと着弾予測ガイド',
      text: '飛行中の探査機はネオンの残像を描き、発射前には重力計算済みの予測軌道を点線表示。狙った星へ届くルートを目で確かめられます。',
    },
    {
      title: '星を集めて伸びるコンボ倍率',
      text: '星を連続で回収するとコンボが増加し、スコア倍率が上昇。1回の飛行でまとめて回収するほど大きなリターンを得られます。',
    },
    {
      title: '全6ラウンドの個性ある星図',
      text: 'ルミナ、ヴェガ、オルビスなど名前のついた惑星が配置された6つの星図を順番に攻略。ラウンドが進むほど重力配置と星の数が変化します。',
    },
    {
      title: '3機の探査機で挑むラウンド攻略',
      text: '各ラウンドで使える探査機は3機。衝突や軌道離脱でロストしても、残機があれば再発射できます。使い切る前に星をすべて集めましょう。',
    },
    {
      title: '390pxでも遊びやすいワンフィンガー設計',
      text: 'スマートフォンでは画面をドラッグするだけ。タッチ操作の誤スクロールを防ぐ設計と、高解像度ディスプレイ対応のくっきりした描画を両立しています。',
    },
  ],
  steps: [
    {
      title: '発射台からドラッグして照準を合わせる',
      text: 'ゲーム画面を押したまま指を動かすと、発射方向とパワーが決まります。予測軌道の点線を見ながら星へ向けて調整しましょう。',
    },
    {
      title: '指を離して探査機を発射',
      text: '狙いが決まったら指を離して発射。探査機は惑星の重力に引かれながら飛び、軌道が光のトレイルとして残ります。',
    },
    {
      title: '重力で曲がる軌道で星を回収',
      text: '星に近づくと自動で回収され、コンボとスコアが加算。惑星に衝突したり画面外へ離脱すると探査機を失います。',
    },
    {
      title: '3機以内に星を集めて次の星図へ',
      text: 'ラウンド内の星をすべて集めるとクリア。残った探査機数に応じたボーナスを獲得し、次のラウンドへ進みます。',
    },
  ],
  faqs: [
    {
      q: '重力オービットは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも操作できますか？',
      a: 'はい。画面をドラッグして狙いを定め、指を離すだけで発射できます。390px幅の画面でも遊びやすいようにレイアウトと描画を調整しています。',
    },
    {
      q: '星をうまく集めるコツはありますか？',
      a: '惑星のすぐ横を通るように撃つと軌道が大きく曲がります。発射前の予測軌道を確認し、星の並びに沿って曲がるルートを選ぶのがコツです。',
    },
    {
      q: '1回のプレイ時間はどれくらいですか？',
      a: '全6ラウンドでおよそ30〜90秒が目安です。1ラウンドにつき探査機は3機まで使え、失敗するとその時点でリザルトになります。',
    },
    {
      q: 'ベストスコアは保存されますか？',
      a: 'はい。自己ベストはブラウザのlocalStorageに保存され、ヘッダーとリザルト画面に表示されます。リセットボタンでいつでも最初から遊べます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやパズルをまとめて探す' },
    { href: '/ball-multiply', label: 'ボールマルチプライ', description: 'ボールを増やして駆け抜けるアクションゲーム' },
    { href: '/bubble-merge', label: 'バブルマージ', description: '泡をくっつけて大きくするマージパズル' },
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

const pageTitle = `${game.name}｜重力スリングショットで星を巡る無料シミュレーション`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'simulation',
  keywords: [
    '重力オービット',
    '重力ゲーム',
    'スリングショットゲーム',
    '軌道シミュレーション',
    '物理シミュレーション 無料',
    'ブラウザゲーム 無料',
    '星集め ゲーム',
    'ミニゲーム シミュレーション',
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
