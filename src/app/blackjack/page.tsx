import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import BlackjackGame from '@/components/cards/blackjack/BlackjackGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/blackjack',
  name: 'ブラックジャック（21・期待値ナビ付）',
  h1: 'ブラックジャック（21）｜ベーシックストラテジー＆確率ナビ搭載の無料トランプゲーム',
  description:
    '本格6デッキシュー対応のカジノトランプゲーム「ブラックジャック（21）」を無料ブラウザプレイ。ヒット・スタンド・ダブルダウン・スプリット・インシュランス・サレンダーの全アクションに対応し、手札とディーラーのアップカードから数学的最適手を導く「ベーシックストラテジー＆バースト確率ナビ」を搭載しています。',
  image: '/ogp.png',
  genre: ['トランプ', 'カードゲーム', 'カジノ', 'ブラックジャック'],
  features: [
    {
      title: '本格6デッキ（312枚）シュー＆カジノ公式ルール準拠',
      text: 'ディーラーは17以上ですべてスタンド（S17）、ナチュラルブラックジャックは1.5倍（3:2）配当、インシュランスは2:1配当の本格仕様です。',
    },
    {
      title: 'ダブル・スプリット・サレンダー・インシュランス完全対応',
      text: '基本のヒット＆スタンドだけでなく、賭け金を倍にして1枚だけ引くダブルダウン、ペアを2手に分けるスプリット、半額返却で降りるサレンダーまで網羅しています。',
    },
    {
      title: 'リアルタイム「ベーシックストラテジー＆確率ナビ」搭載',
      text: 'ハードハンド・ソフトハンド・ペアの3分類とディーラーの表カードを比較し、期待値が最大になる推奨アクションと理由をその場で解説表示します。',
    },
    {
      title: '次ヒット時のバースト確率（%）と残りハイカード比率を可視化',
      text: '6デッキシュー内の残りカード構成から、次に引いたときに21を超えてバーストする確率や10・A比率（True Count参考値）をライブ計算します。',
    },
    {
      title: 'チップバンクロール管理と無料補充・戦績保存',
      text: '1,000チップからスタートし、+10/+50/+100/+500/2倍のクイックベットが可能。万が一チップがなくなってもワンタップで無料補充できます。',
    },
    {
      title: 'スマホでもPCでも押しやすいカジノテーブルUI',
      text: '390px幅のスマートフォン画面でもカードとアクションボタンが一目でわかるレスポンシブ設計です。',
    },
  ],
  steps: [
    {
      title: 'ベット額を決めて「DEAL」をタップ',
      text: '+10〜+500ボタンでチップを賭け、「DEAL（カードを配る）」を押すとプレイヤーとディーラーに2枚ずつ配られます。',
    },
    {
      title: '期待値ナビを参考にアクションを選択',
      text: '合計21に近づけるよう「ヒット（もう1枚引く）」または「スタンド（現在の点数で勝負）」を選びます。チャンス手ではダブルダウンやスプリットも有効です。',
    },
    {
      title: 'ディーラーが17以上になるまでドロー',
      text: 'プレイヤーの行動が終わるとディーラーが伏せカードをオープンし、合計17以上になるまでカードを引いて勝敗が決まります。',
    },
  ],
  faqs: [
    {
      q: 'ブラックジャックは完全無料で遊べますか？',
      a: 'はい。ゲーム内チップのみを使用する無料ブラウザゲームです。課金要素や会員登録は一切ありません。',
    },
    {
      q: 'A（エース）の点数はどう数えますか？',
      a: 'Aは「11点」または「1点」のどちらか都合の良い方で自動計算されます。Aを11として数えても21を超えない手を「ソフトハンド」と呼びます。',
    },
    {
      q: 'ベーシックストラテジーとは何ですか？',
      a: '自分の手札の合計値とディーラーの見えているカード（アップカード）の組み合わせに対して、コンピュータシミュレーションで確率的に最も損をしない（期待値が高い）と証明された定石表のことです。',
    },
    {
      q: 'サレンダー（Surrender）はいつ使うのが有利ですか？',
      a: '自分の手札がハード16でディーラーが9・10・Aのときや、ハード15でディーラーが10のときは、勝負を続けても勝率が25%未満のため、最初の2枚時点でベット半額を回収して降りるサレンダーが数学的に最善となります。',
    },
    {
      q: 'チップが0になったらどうなりますか？',
      a: '画面左上の「+1,000 無料補充」ボタンからいつでもチップを補充して続けて遊べます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/texas-holdem', label: 'テキサスホールデム・ポーカー', description: 'リアルタイム勝率＆ポットオッズ解析付きのAI 4人対戦ポーカー' },
    { href: '/klondike', label: 'ソリティア（クロンダイク）', description: '1枚・3枚めくり対応の王道ソリティア' },
    { href: '/daifugo', label: '大富豪（大貧民）', description: '革命・8切り・階段・都落ち対応の4人対戦トランプ' },
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

const pageTitle = `${game.name}｜ベーシックストラテジー搭載の無料トランプゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ブラックジャック 無料',
    'ブラックジャック ブラウザ',
    'ベーシックストラテジー 練習',
    'トランプ 21 無料',
    'カジノ カードゲーム 無料',
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

export default function BlackjackPage() {
  return (
    <main className="bg-slate-950">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <BlackjackGame />
      <SeoContentSection
        variant="dark"
        eyebrow="CASINO STRATEGY GUIDE"
        title={`${game.name}の特徴とルール・攻略法`}
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
