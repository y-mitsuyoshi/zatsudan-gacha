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
  h1: 'ドミノ・カスケード｜間隔と物理を試せる無料ドミノ連鎖シミュレーター',
  description:
    'ドミノを自由に並べ、間隔・高さ・摩擦・押し出し・重力を調整して連鎖反応を観察する無料のブラウザシミュレーター。S字・ループ・ジグザグのプリセット、0.5x・1x・2xの速度切替、一時停止と1ステップ送り、おまかせ配置、クリアを備え、倒壊数・残り・伝播速度・最大連鎖・完走状況を確認できます。',
  image: '/ogp.png',
  genre: ['シミュレーション', '物理', 'サンドボックス'],
  features: [
    { title: 'なぞって置ける自由配置', text: 'トラックを指でなぞってドミノを配置し、既存のドミノをタップすると削除できます。間隔ガイドは連鎖が届く間隔を緑、途切れる間隔を赤で表示します。' },
    { title: '3つのプリセットコース', text: 'S字カーブ、ループ、ジグザグの3コースを収録。コースを選ぶと現在の間隔設定で自動配置され、すぐに連鎖を試せます。' },
    { title: '物理パラメータの調整', text: '間隔、ドミノの高さ、摩擦、押し出し、重力をスライダーで変更可能。条件を変えながら連鎖の挙動を比較できます。' },
    { title: '速度切替とステップ観察', text: '0.5x・1x・2xの速度切替に加え、一時停止と1ステップ送りを搭載。ゆっくり再生して倒れ方や伝わり方を細かく観察できます。' },
    { title: '観察用メトリクス', text: '倒壊数、残り、伝播速度、最大連鎖、完走状況だけを表示。採点やランキングを挟まず、連鎖そのものを観察できます。' },
    { title: 'スマホ対応・インストール不要', text: '390px幅でも操作しやすいレイアウトとタッチ操作に対応。PCでもスマートフォンでもブラウザを開くだけで試せます。' },
  ],
  steps: [
    { title: 'コースを選ぶ', text: 'S字・ループ・ジグザグのプリセットからコースを選択します。おまかせ配置で現在の間隔に沿ってドミノが並びます。' },
    { title: '配置と物理条件を調整する', text: 'トラックをなぞってドミノを追加し、タップで削除。間隔、高さ、摩擦、押し出し、重力を変えて間隔ガイドを確認します。' },
    { title: '連鎖開始して観察する', text: '連鎖開始ボタンで最初のドミノを倒します。速度切替、一時停止、1ステップ送りを使いながら連鎖の伝わり方を観察します。' },
    { title: '数値を確認して再調整する', text: '倒壊数、残り、伝播速度、最大連鎖、完走状況を見て、間隔やコースを変えながら何度でも試せます。' },
  ],
  faqs: [
    { q: 'ドミノ・カスケードは無料で遊べますか？', a: 'はい。ブラウザで開くだけで無料で試せます。ダウンロードや会員登録は不要です。' },
    { q: 'スマートフォンでも操作できますか？', a: 'はい。画面をタップまたはなぞってドミノを配置・削除でき、390px幅の画面でも操作できるレイアウトです。' },
    { q: 'ドミノを削除するにはどうすればいいですか？', a: '既存のドミノをタップすると削除されます。何もない場所からドラッグすると連続配置、ドミノの上からドラッグすると連続削除になります。' },
    { q: '間隔ガイドの色は何を意味しますか？', a: '緑のリンクは現在のドミノの高さで次の一枚に届く間隔、赤のリンクは届かず連鎖が途切れる間隔です。高さを変えると到達距離も変化します。' },
    { q: '連鎖が途中で止まるのはなぜですか？', a: '隣り合うドミノの間隔が、現在の高さで届く距離を超えると連鎖が止まります。ガイドが赤い箇所を詰めるか、高さを上げて再調整してください。' },
    { q: '採点や記録はありますか？', a: '採点やランキングはありません。表示されるのは倒壊数、残り、伝播速度、最大連鎖、完走状況などの観察用指標だけです。' },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやミニゲームをまとめて探す' },
    { href: '/ball-multiply', label: 'ボール増殖シミュレーター', description: 'ボールが増えて跳ねる物理シミュレーション' },
    { href: '/sand-flow', label: 'サンドフロー', description: '砂の流れを描いて楽しむシミュレーション' },
    { href: '/gravity-orbit', label: '重力オービット', description: '重力と軌道を試す物理シミュレーター' },
  ],
};

const TITLE = 'ドミノ・カスケード';

export const metadata: Metadata = {
  title: TITLE,
  description: game.description,
  keywords: [
    'ドミノ・カスケード',
    'ドミノシミュレーター',
    'ドミノ倒し',
    '連鎖シミュレーション',
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
