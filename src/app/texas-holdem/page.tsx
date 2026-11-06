import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import TexasHoldemGame from '@/components/cards/texas-holdem/TexasHoldemGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/texas-holdem',
  name: 'テキサスホールデム・ポーカー（VIPカジノAI 4人対戦）',
  h1: 'テキサスホールデム・ポーカー｜個性派AIキャラ・音声演出・リアルタイム勝率＆EV解析付きの無料VIPカジノ対戦',
  description:
    '世界標準のカジノポーカー「ノーリミット・テキサスホールデム（Texas Hold’em）」をブラウザで今すぐ無料プレイ。元ウォール街クオンツのヴィクター、社交界の女帝セラフィナ、マカオの重鎮ライアンの個性豊かなAI 3名とのフルボイス＆セリフ演出付き4人対戦に加え、モンテカルロ勝率（Equity）・ポットオッズ・アウツ（Outs）・EV判定をライブ算出するプロ仕様HUDを搭載しています。',
  image: '/ogp.png',
  genre: ['トランプ', 'ポーカー', 'カードゲーム', 'カジノ'],
  features: [
    {
      title: '個性豊かな3人のVIPハイローラーAIキャラクター＆セリフ演出',
      text: 'TAG（タイト・アグレッシブ）の「ヴィクター・クロウ」、LAG＆ブラフ巧者の「セラフィナ・ヴァレンティノ」、鉄壁トラッパーの「ライアン・チェン」が表情変化付きカスタムイラストとライブ吹き出しセリフでテーブルを盛り上げます。',
    },
    {
      title: 'Web Audio合成による本格カジノ効果音・ラウンジBGM・ボイス演出',
      text: 'リフルシャッフル音、クレイチップの重厚な金属/陶器クラック音、チェック時のテーブルノック音（コンコン）、オールインの重低音スティンガー、さらにジャズラウンジBGMとディーラー＆キャラ音声切り替えに対応しています。',
    },
    {
      title: 'モンテカルロ勝率・ポットオッズ・ドロー＆アウツ（Outs）リアルタイム解析',
      text: 'プリフロップの手札Tierランク（S〜D）から、フロップ以降のフラッシュドロー・ストレートドローのアウツ数、必要勝率と推定勝率の＋EV/－EV比較まで一目で分かります。',
    },
    {
      title: 'キャッシュゲーム＆VIPサバイバルトーナメントの2モード搭載',
      text: 'チップ自動補充で気軽に練習できる「キャッシュゲーム（SB 10 / BB 20）」と、3ハンドごとにブラインドが上昇する「VIPトーナメントモード」をいつでも切り替え可能です。',
    },
    {
      title: '自在なレイズ額スライダー＆ワンタップ比率ベット・キーボード操作',
      text: '1BB単位で微調整できるレイズスライダーに加え、「MIN/2xBB」「1/2 POT」「POT」「ALL-IN」のプリセットボタン、さらにPC向けのショートカットキー（F/C/R/A/Space）も完備しています。',
    },
    {
      title: '3種類のラグジュアリー・カジノテーブルテーマ切替',
      text: '「エメラルド・ロイヤル」「ベルベット・クリムゾン」「ミッドナイト・ゴールド」の3種類のVIPテーブルフェルトを気分に合わせてカスタマイズできます。',
    },
  ],
  steps: [
    {
      title: 'プリフロップ（手札2枚の配布＆Tierランク確認）',
      text: '各プレイヤーに2枚のホールカードが配られます。SB/BBの強制ベット後、手札ランク（Tier S〜D）とポジションを見てフォールド・コール・レイズを選択します。',
    },
    {
      title: 'フロップ（共通カード3枚）→ターン（4枚目）→リバー（5枚目）',
      text: '場の中央に全員共通で使えるコミュニティカードが3枚・1枚・1枚と順番に開かれ、アウツ数やポットオッズを見ながら各ストリートで駆け引きを行います。',
    },
    {
      title: 'ショーダウン（計7枚から最強の5枚で勝負＆サイドポット精算）',
      text: '最後まで残ったプレイヤー同士で手札を公開し、自分の2枚＋場の5枚の計7枚から作れる最強の5枚役でポットを獲得します。',
    },
  ],
  faqs: [
    {
      q: 'テキサスホールデム・ポーカーは無料で遊べますか？',
      a: 'はい。ブラウザ上で登録不要・完全無料で遊べます。課金要素は一切ありません。',
    },
    {
      q: 'リアルタイム勝率（Equity）やアウツ（Outs）とは何ですか？',
      a: 'Equityは残りの山札をランダムに配り切った場合に自分が勝つ確率をモンテカルロ法で算出した数値です。Outsはフラッシュやストレートなど、次のカードで強力な役が完成する残り枚数を表します。',
    },
    {
      q: '対戦相手のVPIP / PFRとはどういう意味ですか？',
      a: 'VPIPはプリフロップで自発的にポットに参加する割合、PFRはプリフロップでレイズして参加する割合です。数値が高いセラフィナやライアンは広いハンドで参加し、数値が低いヴィクターは強い手札に絞って攻めてきます。',
    },
    {
      q: '効果音やBGM、キャラクターボイスは消せますか？',
      a: 'はい。画面上部のヘッダーから「効果音」「カジノBGM」「ボイス」をそれぞれ独立してワンタップでON/OFF切り替えできます。',
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
        eyebrow="VIP CASINO NO-LIMIT HOLD'EM GUIDE"
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
