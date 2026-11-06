import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import TexasHoldemGame from '@/components/cards/texas-holdem/TexasHoldemGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/texas-holdem',
  name: 'テキサスホールデム・ポーカー（AI 4人対戦）',
  h1: 'テキサスホールデム・ポーカー｜リアルタイム勝率＆ポットオッズ解析付きの無料AI対戦',
  description:
    '世界標準のカジノポーカー「ノーリミット・テキサスホールデム（Texas Hold’em）」をブラウザで今すぐ無料プレイ。プレイスタイルの異なるAI 3名との4人テーブル対戦に加え、手札2枚とコミュニティカード5枚からモンテカルロ法で推定勝率（Equity）と必要勝率（Pot Odds）をライブ算出する解析メーターを搭載しています。',
  image: '/ogp.png',
  genre: ['トランプ', 'ポーカー', 'カードゲーム', 'カジノ'],
  features: [
    {
      title: '本格ノーリミット・テキサスホールデム4人テーブル',
      text: 'ディーラーボタン（D）・スモールブラインド（SB）・ビッグブラインド（BB）のローテーションから、プリフロップ・フロップ・ターン・リバー・ショーダウンまで完全再現しています。',
    },
    {
      title: '3つの異なる戦略を持つAIプレイヤーと対戦',
      text: '「タイト・アグレッシブ」「ルーズ・コーラー」「ブラフ・バランサー」の3タイプのAIを相手に、ハンドレンジの読み合いやベットサイズ戦略を練習できます。',
    },
    {
      title: 'モンテカルロ法によるリアルタイム勝率（Equity）＆ポットオッズ解析',
      text: '自分のホールカードとボードの状況から残りの組み合わせを高速シミュレーションし、推定勝率（%）とコールに必要な勝率（ポットオッズ）をリアルタイム比較します。',
    },
    {
      title: '7枚から最強の5枚を自動判定するハンドエバリュエーター',
      text: 'ロイヤルストレートフラッシュからハイカードまで、キッカー（添え札）の強弱を含む正確な役判定を行い、現在成立している最強役をハイライト表示します。',
    },
    {
      title: 'ワンタップで使えるポット比率レイズ＆オールインボタン',
      text: 'フォールド・チェック/コールに加え、「2x BB」「1/2 POT」「POT」「ALL-IN」のクイックベットボタンを備え、スマートフォンでも快適に操作できます。',
    },
    {
      title: '登録不要・チップ無料自動補充で何度でも練習可能',
      text: 'チップが減っても自動でリバイ（補充）されるため、初心者の方の役覚えから中級者のオッズ計算トレーニングまで無料で楽しめます。',
    },
  ],
  steps: [
    {
      title: 'プリフロップ（手札2枚の配布）',
      text: '各プレイヤーに2枚のホールカードが配られます。SB/BBの強制ベット後、手札の強さを見てフォールド・コール・レイズを選択します。',
    },
    {
      title: 'フロップ（共通カード3枚）→ターン（4枚目）→リバー（5枚目）',
      text: '場の中央に全員共通で使えるコミュニティカードが3枚・1枚・1枚と順番に開かれ、各ストリートでベッティングを行います。',
    },
    {
      title: 'ショーダウン（計7枚から最強の5枚で勝負）',
      text: '最後まで残ったプレイヤー同士で手札を公開し、自分の2枚＋場の5枚の計7枚から作れる最強の5枚役でポットを獲得します。',
    },
  ],
  faqs: [
    {
      q: 'テキサスホールデム・ポーカーは無料で遊べますか？',
      a: 'はい。ブラウザ上で登録不要・完全無料で遊べます。課金要素は一切ありません。',
    },
    {
      q: 'リアルタイム勝率（Equity）とは何ですか？',
      a: '現在見えている自分のカード2枚と場のコミュニティカードから、まだ出ていない山札のカードをランダムに配り切った場合に自分が勝つ確率をモンテカルロ・シミュレーションで算出した数値です。',
    },
    {
      q: 'ポットオッズ（必要勝率）はどう活用すればいいですか？',
      a: '相手のベットにコールするとき、「コール額 ÷（現在のポット総額＋コール額）」で求められる必要勝率よりも、自分の推定勝率（Equity）の方が高ければ、長期的にプラス期待値（＋EV）のコールと判定できます。',
    },
    {
      q: 'ポーカーの役がまだうろ覚えでも遊べますか？',
      a: 'はい。現在成立している役の名前が画面上にリアルタイムで自動表示され、対象となるカードもハイライトされるため、遊びながら自然にポーカーの役を覚えられます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/blackjack', label: 'ブラックジャック（21）', description: 'ベーシックストラテジー＆確率ナビ付きのカジノカードゲーム' },
    { href: '/daifugo', label: '大富豪（大貧民）', description: '革命・8切り・階段・都落ち対応のAI 4人対戦トランプ' },
    { href: '/freecell', label: 'フリーセル', description: '全カード表向きから始まる完全情報ソリティアパズル' },
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

const pageTitle = `${game.name}｜勝率＆オッズ解析付きの無料ポーカーゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'テキサスホールデム 無料',
    'ポーカー 無料 ブラウザ',
    'テキサスホールデム AI対戦',
    'ポーカー 勝率計算',
    'トランプ ポーカー 無料',
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

export default function TexasHoldemPage() {
  return (
    <main className="bg-slate-950">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <TexasHoldemGame />
      <SeoContentSection
        variant="dark"
        eyebrow="NO-LIMIT HOLD'EM GUIDE"
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
