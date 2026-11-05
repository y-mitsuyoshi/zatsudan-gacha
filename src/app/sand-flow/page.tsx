import type { Metadata } from 'next';
import { SandFlowGame } from '@/components/sims/sand-flow/SandFlowGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import type { GameSeoData } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/sand-flow',
  name: 'サンド・フロー・シミュレーター',
  h1: 'サンド・フロー・シミュレーター｜色砂を注いでゾーンを埋める無料落下砂シミュレーション',
  description:
    '色砂をドラッグ＆タップで注ぎ、4つのターゲットゾーンを埋める無料の落下砂シミュレーションゲーム。4色の砂と混色、障害物、コンボ、スコア、70秒のタイムリミット、リザルトを搭載し、スマートフォンの390px幅でも快適に遊べます。',
  image: '/ogp.png',
  genre: ['シミュレーション', 'パズル', 'カジュアル'],
  features: [
    {
      title: 'ドラッグ＆タップで砂を注ぐ直感操作',
      text: '画面をなぞった位置から色砂が降り注ぎ、重力に従って積もる様子をリアルタイムに描画します。スマートフォンでは指一本、PCではマウスで自由に砂を操れます。',
    },
    {
      title: '4色の砂と混色シミュレーション',
      text: '朱・金・翠・紫の4色を切り替えて注げます。異なる色の砂が接すると混色が発生し、どのターゲットゾーンにも数えられる特別な色に変化します。',
    },
    {
      title: '4つのターゲットゾーンを埋めてクリア',
      text: '画面下部に並ぶ4つのゾーンを対応する色で埋めるとクリアです。残り時間に応じたボーナスとコンボ倍率が加わり、スコアが大きく伸びます。',
    },
    {
      title: '障害物が生む予測不能な砂の流れ',
      text: '盤面には複数のバーと仕切りを配置。砂は障害物に当たって分岐するため、狙ったゾーンへ届けるには注ぐ位置とタイミングの調整が必要です。',
    },
    {
      title: 'コンボ・スコア・タイマーを搭載',
      text: '砂が安定して積もるたびにコンボが上昇。混色やゾーンクリアでもボーナスが入り、70秒の制限時間内で効率よく砂を流して高スコアを目指せます。',
    },
    {
      title: '390px幅対応のモバイル設計',
      text: 'スマートフォンでも操作しやすい縦長レイアウトと大きなカラーボタンを用意。devicePixelRatioに合わせた高解像度描画とrequestAnimationFrameで滑らかに動作します。',
    },
  ],
  steps: [
    {
      title: '色を選んでゲーム開始',
      text: 'スタートボタンを押し、画面下の4色カラーパレットから注ぎたい砂の色を選びます。',
    },
    {
      title: '画面をドラッグまたはタップして砂を注ぐ',
      text: '盤面の上部をなぞると、その位置から色砂が落下します。押し続けると連続で砂を注げます。',
    },
    {
      title: '障害物を避けてゾーンへ誘導',
      text: 'バーに当たって散らばる砂の流れを見ながら、対応する色のターゲットゾーンへ集中させましょう。',
    },
    {
      title: '全ゾーンクリアと高スコアを目指す',
      text: 'ゾーンを埋めるほどボーナスが発生。混色とコンボを活用し、70秒終了時のランクとスコアを確認します。',
    },
  ],
  faqs: [
    {
      q: 'サンド・フロー・シミュレーターは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で遊べます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。390px幅の画面でも遊びやすい縦長レイアウトに対応しています。画面をドラッグまたはタップして砂を注いでください。',
    },
    {
      q: '砂の色はどうやって切り替えますか？',
      a: 'ゲーム画面の下にある4つのカラーボタンを押すと、朱・金・翠・紫の砂を切り替えられます。選択中の色は枠線とラベルで確認できます。',
    },
    {
      q: '混色にはどんな効果がありますか？',
      a: '異なる色の砂が接すると混色が発生し、どのターゲットゾーンにも数えられる特別な色になります。混色時には追加スコアとコンボも入ります。',
    },
    {
      q: 'スコアを伸ばすコツはありますか？',
      a: '砂を安定して積もらせてコンボを切らさないこと、混色を狙うこと、対応する色でゾーンを早めに埋めることが高スコアの鍵です。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'シミュレーションやミニゲームをまとめて探す' },
    { href: '/ball-multiply', label: 'ボール増殖シミュレーター', description: 'ボールが増えて跳ねる物理シミュレーション' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード', description: 'ドミノを並べて連鎖を起こすシミュレーション' },
    { href: '/tools', label: '無料ツール一覧', description: '診断やメーカーなどの便利ツールを探す' },
  ],
};

export const metadata: Metadata = {
  title: 'サンド・フロー・シミュレーター',
  description: game.description,
  keywords: [
    'サンド・フロー・シミュレーター',
    '落下砂シミュレーション',
    '砂ゲーム',
    '砂時計ゲーム',
    'パーティクル シミュレーション',
    'ブラウザゲーム 無料',
    'シミュレーションゲーム',
    '無料ミニゲーム',
  ],
  alternates: {
    canonical: '/sand-flow',
  },
  openGraph: {
    title: 'サンド・フロー・シミュレーター',
    description: game.description,
    url: `${APP_URL}/sand-flow`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'サンド・フロー・シミュレーター',
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
