import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import DiceCasinoGame from '@/components/casino/dice-casino/DiceCasinoGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/dice-casino',
  name: 'ダイス・カジノ',
  h1: 'ダイス・カジノ｜3つのダイスで楽しむ無料ブラウザ・カジノゲーム',
  description:
    '3つのダイスを振り、出目の合計・大小・奇数偶数・ダブル・トリプルを予想する無料ブラウザ向けカジノゲームです。仮想チップを選んでベットし、配当と収支を自動計算。ラウンド履歴やルール表示、スマートフォン対応のベットボードを備え、実際のお金を使わずに気軽に遊べます。',
  image: '/ogp.png',
  genre: ['カジノ', 'ダイスゲーム', 'テーブルゲーム'],
  features: [
    {
      title: '3つのダイスが転がる臨場感あるテーブル',
      text: '真鍮のレールとエメラルドのフェルトに囲まれた専用テーブルで、3つのダイスが転がるアニメーションを楽しめます。停止後は出目と合計がすばやく表示されます。',
    },
    {
      title: '大小・奇数偶数から合計14種まで多彩なベット',
      text: '合計11〜17の「大」、4〜10の「小」、奇数・偶数に加え、4〜17の各合計、ダブル、トリプルまで用意。1回のロールで複数のベットを組み合わせられます。',
    },
    {
      title: 'チップを選んで盤面をタップする直感操作',
      text: '5・10・25・50・100の仮想チップを選び、ベット・スポットをタップするだけ。ベット合計と残りチップを常に確認でき、クリアボタンでまとめて取り消せます。',
    },
    {
      title: '配当と収支を自動計算',
      text: '当たったベットごとに「賭け金＋賭け金×オッズ」を計算し、払戻と収支をその場で表示。ダブルやトリプルの成立、複数ベットの合計払戻も確認できます。',
    },
    {
      title: 'ラウンド履歴とセッション統計',
      text: '直近12ラウンドの出目・合計・収支をサイドパネルに記録。ラウンド数、配当のあった回数、最高払戻を確認しながらプレイできます。',
    },
    {
      title: '仮想チップ専用の安心設計',
      text: '実際のお金や換金要素は一切ありません。ベット上限は手持ちチップまでに制限され、リセットで1,000チップの初期状態に戻せます。390px幅のスマートフォンにも対応しています。',
    },
  ],
  steps: [
    {
      title: 'チップを選ぶ',
      text: '5〜100のなかからベットしたいチップを選びます。選択中のチップはベット・スポットをタップするたびに加算されます。',
    },
    {
      title: 'ベット・スポットをタップ',
      text: '大・小・奇数・偶数、合計、ダブル、トリプルから予想を選びます。複数のスポットにベットでき、合計額はロール時に手持ちチップから差し引かれます。',
    },
    {
      title: '「ロール」で3つのダイスを振る',
      text: 'ベットが決まったらロールボタンを押します。3つのダイスが回転し、停止後に出目・合計・成立した役が確定します。',
    },
    {
      title: '配当を確認して次のラウンドへ',
      text: '的中したベットの払戻が自動で加算されます。履歴と収支を確認し、必要ならチップを追加して次のラウンドへ進みます。',
    },
  ],
  faqs: [
    {
      q: 'ダイス・カジノは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。登録やダウンロードは不要で、ゲーム内の仮想チップのみを使用します。',
    },
    {
      q: '実際のお金や換金要素はありますか？',
      a: 'ありません。このゲームは娯楽用のシミュレーションで、チップの購入・換金・外部との取引は一切できません。',
    },
    {
      q: '大・小と奇数・偶数のルールを教えてください',
      a: '大は合計11〜17、小は合計4〜10へのベットです。奇数・偶数は合計の偶奇で判定します。大・小・奇数・偶数はいずれもゾロ目（トリプル）が出ると不成立になります。',
    },
    {
      q: '配当はどのように計算されますか？',
      a: '的中したベットごとに「賭け金＋賭け金×オッズ」を払い戻します。たとえば合計9に25チップを賭けて的中すると、25＋25×6＝175チップが戻ります。はずれのベットの賭け金は没収されます。',
    },
    {
      q: 'スマートフォンでも快適に遊べますか？',
      a: 'はい。390px幅のスマートフォンでもベットボードやチップ、ロールボタンが画面内に収まるレスポンシブ設計です。各ボタンはタップしやすい大きさを確保しています。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'カジノ・ダイス・パズルなど遊べるゲームを探す' },
    { href: '/roulette-casino', label: 'ルーレット・カジノ', description: 'ホイールとベットボードで楽しむカジノゲーム' },
    { href: '/baccarat', label: 'バカラ', description: 'プレイヤーとバンカーの勝負を予想するカードゲーム' },
    { href: '/keno-lounge', label: 'キノ・ラウンジ', description: '数字を選んで抽選結果を待つカジノゲーム' },
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

const pageTitle = 'ダイス・カジノ';

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ダイス・カジノ',
    'ダイスゲーム 無料',
    'サイコロ カジノ',
    'シックボー 風 ゲーム',
    'ブラウザ カジノゲーム',
    '無料 カジノ ゲーム',
    'ダイス ベット ゲーム',
    '仮想チップ ゲーム',
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

export default function DiceCasinoPage() {
  return (
    <main className="bg-[#0f0c08]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <DiceCasinoGame />
      <SeoContentSection
        variant="dark"
        eyebrow="THREE DICE SALON — CASINO GAME GUIDE"
        title={`${game.name}の特徴とルール・遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ブラウザゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
