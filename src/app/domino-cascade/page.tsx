import type { Metadata } from 'next';
import DominoCascadeGame from '@/components/sims/domino-cascade/DominoCascadeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import type { GameSeoData } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/domino-cascade',
  name: 'ドミノ・カスケード',
  h1: 'ドミノ・カスケード｜配置と連鎖を楽しむ無料ドミノシミュレーション',
  description:
    '真鍮のトラックにドミノを並べ、最初の一枚を倒して連鎖を起こす無料のブラウザシミュレーションゲーム。S字・ループ・ジグザグのプリセットコース、自由配置、パーフェクト間隔ボーナス、コンボ、スコアとランク判定を搭載しています。',
  image: '/ogp.png',
  genre: ['シミュレーション', 'パズル', 'カジュアル'],
  features: [
    { title: 'なぞって置ける自由配置', text: 'トラックを指でなぞるだけ、またはタップするだけでドミノを配置。置きたい位置に合わせてガイドが表示され、間隔の良さを色で確認できます。' },
    { title: '3つのプリセットコース', text: 'S字カーブ、ループ、ジグザグの3コースを収録。おまかせで埋めれば、すぐに気持ちのよい連鎖を楽しめます。' },
    { title: 'パーフェクト間隔とコンボ', text: 'ドミノの間隔が理想範囲に収まるとPERFECTコンボが発生。連続で決めるほどボーナスが伸び、スコアが大きく跳ね上がります。' },
    { title: '物理感のある連鎖アニメーション', text: '倒れたドミノが次の一枚へ伝わる様子を60fpsのキャンバスアニメーションで再現。粉塵やスコアポップも連鎖の気持ちよさを演出します。' },
    { title: 'スコアとランクの結果画面', text: '倒壊数、PERFECT数、最大コンボ、コース充足率からS〜Dのランクを判定。全ドミノ倒壊ボーナスもあり、何度でも挑戦できます。' },
    { title: 'スマホ対応・インストール不要', text: '390px幅でも読みやすいHUDと操作ボタンを用意。PCでもスマートフォンでも、ブラウザを開くだけで登録なしに遊べます。' },
  ],
  steps: [
    { title: 'スタートしてコースを決める', text: 'タイトル画面のスタート、またはS字・ループ・ジグザグのプリセットからコースを選びます。' },
    { title: 'ドミノを配置する', text: 'トラックをなぞるかタップしてドミノを追加。プリセットボタンを使えば理想間隔で自動配置されます。' },
    { title: '打ち上げボタンで連鎖開始', text: '配置できたら打ち上げボタンを押して最初のドミノを倒します。倒壊数とPERFECTコンボがリアルタイムで加算されます。' },
    { title: '結果を確認してもう一度', text: '連鎖が止まると結果画面が表示されます。ランクとスコアを確認し、間隔を意識しながら再挑戦しましょう。' },
  ],
  faqs: [
    { q: 'ドミノ・カスケードは無料で遊べますか？', a: 'はい。ブラウザで開くだけで完全無料で遊べます。ダウンロードや会員登録は不要です。' },
    { q: 'スマートフォンでも遊べますか？', a: 'はい。画面をタップまたはなぞってドミノを配置し、打ち上げボタンで連鎖を開始できます。390px幅の画面でも操作できるレイアウトです。' },
    { q: 'パーフェクト間隔とは何ですか？', a: '隣り合うドミノの間隔が理想範囲に収まった状態です。連続で決まるとPERFECTコンボが伸び、通常より多くのスコアを獲得できます。' },
    { q: '連鎖が途中で止まるのはなぜですか？', a: 'ドミノ同士の間隔が広すぎると、倒れた一枚が次の一枚に届かず連鎖が止まります。ガイドの色を確認しながら間隔を詰めて配置してください。' },
    { q: 'スコアやベスト記録は保存されますか？', a: '自己ベストスコアはブラウザのlocalStorageに保存されます。ページを閉じても、同じブラウザであれば記録が残ります。' },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやミニゲームをまとめて探す' },
    { href: '/ball-multiply', label: 'ボール増殖シミュレーター', description: 'ボールが増えて跳ねる物理シミュレーション' },
    { href: '/sand-flow', label: 'サンドフロー', description: '砂の流れを描いて楽しむシミュレーション' },
    { href: '/tools', label: '無料ツール一覧', description: '診断やメーカーなどの便利ツールを探す' },
  ],
};

const TITLE = 'ドミノ・カスケード';

export const metadata: Metadata = {
  title: TITLE,
  description: game.description,
  keywords: [
    'ドミノ・カスケード',
    'ドミノゲーム',
    'ドミノ倒し',
    '連鎖シミュレーション',
    '物理シミュレーション 無料',
    'ブラウザゲーム 無料',
    'シミュレーションゲーム',
    '無料ミニゲーム',
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
      />
    </main>
  );
}
