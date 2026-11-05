import type { Metadata } from 'next';
import { SandFlowGame } from '@/components/sims/sand-flow/SandFlowGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import type { GameSeoData } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/sand-flow',
  name: 'サンド・フロー・サンドボックス',
  h1: 'サンド・フロー・サンドボックス｜重力・風・障害物を操る無料落下砂シミュレーター',
  description:
    '色砂を自由に注いで積もり方や混色を観察できる無料の落下砂シミュレーター。重力・風向き・風速・流量・ブラシサイズをリアルタイムに調整し、障害物を描いて流れを変えられます。一時停止・1ステップ・0.5倍/1倍/2倍の速度切替、粒子数や色分布のライブ統計を備え、スマートフォンの390px幅でも操作できます。',
  image: '/ogp.png',
  genre: ['シミュレーション', 'サンドボックス', 'クリエイティブ'],
  features: [
    {
      title: '4色の砂を自由に注ぐサンドボックス',
      text: '朱・金・翠・紫の4色から選び、キャンバスをドラッグするだけで色砂を注げます。ブラシサイズと流量を変えながら、積もり方や崩れ方をリアルタイムに観察できます。',
    },
    {
      title: '重力と風をライブ調整',
      text: '重力の強さを0〜100%で変更。風向きは左・停止・右から選び、風の強さもスライダーで調整できるため、砂丘のような流れや横方向の漂いを試せます。',
    },
    {
      title: '障害物ブラシで流れを設計',
      text: '障害物の追加と削除に対応したブラシで、壁や棚を自由に描けます。砂を分岐させたり受け止めたりして、自分だけの粉体実験装置を作れます。',
    },
    {
      title: '混色が生まれる粒子シミュレーション',
      text: '異なる色の砂が接すると、オレンジや黄緑などの混色に変化。色の分布はライブ統計で確認でき、積層や混ざり方を観察できます。',
    },
    {
      title: '一時停止・ステップ・速度切替',
      text: '再生と一時停止を切り替え、1ステップずつ動かして挙動を確認できます。0.5倍・1倍・2倍の速度切替を備え、じっくり観察することも高速で試すこともできます。',
    },
    {
      title: '上限付きで安定して動くブラウザ設計',
      text: '粒子数は9000粒を上限として表示し、上限到達時は生成を停止して過負荷を防ぎます。DPR対応CanvasとrequestAnimationFrame、格子セルオートマトンで390px幅のスマートフォンでも軽快に動作します。',
    },
  ],
  steps: [
    {
      title: '色とツールを選ぶ',
      text: '砂を注ぐ・障害物を追加・障害物を削除からツールを選び、砂ツールでは4色のカラーパレットから注ぐ色を決めます。',
    },
    {
      title: 'ブラシで砂を注ぐ',
      text: 'キャンバスをドラッグまたはタップすると、選択した色の砂が流れ落ちます。流量とブラシサイズを変えて、細い筋や広い帯を作れます。',
    },
    {
      title: '重力・風・障害物を調整',
      text: '重力や風の強さ、風向きを動かしながら砂の挙動を観察。障害物ブラシで壁を描いたり消したりして、流路を自由に設計できます。',
    },
    {
      title: '一時停止とステップで観察',
      text: '一時停止中も砂や障害物を配置できます。1ステップずつ進めると、粒子の移動や混色の瞬間を細かく確認できます。',
    },
    {
      title: '速度を変えて実験を続ける',
      text: '0.5倍・1倍・2倍から速度を選び、粒子数・静止数・色分布・FPS・ステップ数をライブ統計で確認します。リセットで盤面を初期状態に戻せます。',
    },
  ],
  faqs: [
    {
      q: 'サンド・フロー・サンドボックスは無料で使えますか？',
      a: 'はい。ブラウザで開くだけで無料で利用できます。ダウンロードや会員登録は不要です。',
    },
    {
      q: 'スマートフォンでも操作できますか？',
      a: 'はい。390px幅の画面に対応しており、タップやドラッグで砂を注げます。Canvasはtouch-action:none、ポインターイベントとDPR対応で、指の操作をそのままシミュレーションに反映します。',
    },
    {
      q: '砂の色は混ざりますか？',
      a: 'はい。異なる色の砂が接した状態で時間が経つと混色し、オレンジや黄緑などの色に変化します。現在の混色数はライブ統計で確認できます。',
    },
    {
      q: '粒子数に上限はありますか？',
      a: '粒子数は9000粒が上限です。上限に達すると砂の生成が自動で止まり、画面には現在の粒子数と上限が表示されます。リセットすると再び生成できます。',
    },
    {
      q: 'スコアや制限時間はありますか？',
      a: 'ありません。得点・コンボ・タイマー・クリア条件のない純粋な砂のサンドボックスです。重力や風、障害物を変えながら自由に実験できます。',
    },
    {
      q: 'どのような操作ができますか？',
      a: '重力、流量、ブラシサイズ、色、風向き、風の強さ、障害物の追加・削除、速度0.5倍・1倍・2倍、一時停止・再生、1ステップ、リセットを画面上のコントロールから操作できます。',
    },
  ],
  related: [
    { href: '/games#simulation-games', label: '無料シミュレーション一覧', description: '物理シミュレーションやミニゲームをまとめて探す' },
    { href: '/domino-cascade', label: 'ドミノ・カスケード', description: 'ドミノを並べて連鎖を起こすシミュレーション' },
    { href: '/ball-multiply', label: '増殖ボール・カスケード', description: 'ボールが分裂して増える物理シミュレーション' },
    { href: '/gravity-orbit', label: '重力オービット', description: '重力スリングショットで星を巡るシミュレーション' },
    { href: '/tools', label: '無料ツール一覧', description: '診断やメーカーなどの便利ツールを探す' },
  ],
};

export const metadata: Metadata = {
  title: 'サンド・フロー・サンドボックス｜落下砂シミュレーター',
  description: game.description,
  keywords: [
    'サンド・フロー・サンドボックス',
    '落下砂シミュレーター',
    '砂 シミュレーション',
    'パーティクル シミュレーション',
    '粉体シミュレーション',
    '重力 シミュレーター',
    'ブラウザ シミュレーター',
    '無料 シミュレーション',
  ],
  alternates: {
    canonical: '/sand-flow',
  },
  openGraph: {
    title: 'サンド・フロー・サンドボックス｜落下砂シミュレーター',
    description: game.description,
    url: `${APP_URL}/sand-flow`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'サンド・フロー・サンドボックス｜落下砂シミュレーター',
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
