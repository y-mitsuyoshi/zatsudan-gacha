import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import HexBoardGame from '@/components/board/hex-board/HexBoardGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/hex-board',
  name: 'ヘックス（Hex・六角形接続戦略盤）',
  h1: 'ヘックス（Hex）無料ボードゲーム｜引き分けなしの六角形接続戦略・2ブリッジAI＆2人対戦',
  description:
    '数学者ピート・ハイン（1942年）とノーベル賞数学者ジョン・ナッシュ（1948年）が考案した伝説のトポロジー接続ボードゲーム「ヘックス（Hex）」をブラウザで無料プレイ！赤は上下の辺、青は左右の辺を六角形の石でつなげば勝利。7×7・9×9・11×11の盤面サイズ切替、2ブリッジ仮想接続の可視化、ダイクストラ最短経路AI（初級・中級・上級）、スワップルール、1台での2人対戦に対応しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '数学パズル', 'アブストラクトゲーム'],
  features: [
    {
      title: '「ヘックス定理」により引き分けが数学的に存在しない',
      text: 'ブラウワーの不動点定理と同値であることが証明された「ヘックス定理」により、どのように石を置いても必ず先手（赤）か後手（青）のどちらかの連結が成立し、引き分けにはなりません。',
    },
    {
      title: '「2ブリッジ（仮想接続）」の破線可視化と自動防衛AI',
      text: 'ヘックスの最重要手筋である1マス飛ばしの仮想接続「2ブリッジ」を盤面上にリアルタイム破線表示。上級AIはダイクストラ最短経路探索と2ブリッジ防衛を組み合わせて思考します。',
    },
    {
      title: '7×7高速戦・9×9標準戦・11×11公式戦の3サイズ対応',
      text: '短時間で決着がつく7×7盤面から、じっくり読み合う9×9標準盤、そして国際大会でも使われる11×11公式サイズまでワンタップで切り替えられます。',
    },
    {
      title: '先手必勝の偏りを解消する「スワップルール（パイ・ルール）」',
      text: '先手が1手目に強力な中央付近へ打った際、後手がその1手目を自分の石として引き継げる公式の「スワップ宣言」をON/OFF切替可能です。',
    },
    {
      title: '残り最短接続距離のリアルタイム計測と勝利ルート発光',
      text: '赤（上下）と青（左右）それぞれがあと何手で辺と辺を連結できるかをダイクストラ法でライブ表示。決着時には辺から辺までの最短勝利チェーンが黄金に輝きます。',
    },
    {
      title: '1台で2人対戦・AI戦術ヒント・待った機能',
      text: 'CPUとの頭脳戦はもちろん、スマートフォンやタブレット1台での2人対戦（パス＆プレイ）や、攻防一体の急所を解説する「💡ヒント」機能を搭載しています。',
    },
  ],
  steps: [
    {
      title: '盤面サイズ（7×7 / 9×9 / 11×11）と対戦モードを選ぶ',
      text: 'はじめての方は7×7または9×9がおすすめです。CPU対戦（初級・中級・上級）または1台で2人対戦を選択します。',
    },
    {
      title: '赤は「上辺↔下辺」、青は「左辺↔右辺」を目指して石を置く',
      text: '空いている六角形マスを交互にタップして自分の色の石を置きます。一度置いた石は動かせません。',
    },
    {
      title: '「2ブリッジ（1マス飛ばし）」で効率よく連結を伸ばす',
      text: '隣り合うマスだけでなく、間に2つの共通空きマスを挟む「2ブリッジ」で石を配置すると、相手に止められない仮想接続を作ることができます。',
    },
    {
      title: '相手のルートを遮断しつつ自分の辺と辺をつなげて勝利',
      text: '自分の最短接続を進めながら相手の連結を分断する「攻防一体の急所」を制し、先に両辺をつなげたプレイヤーの勝利です。',
    },
  ],
  faqs: [
    {
      q: 'なぜヘックスには引き分けがないのですか？',
      a: '流水と堤防に例えると直感的にわかります。上下の陸地（赤）を水門、左右の海（青）を水流としたとき、「上下の陸地がつながって水を完全にせき止める」か「左右の海がつながって水が通り抜ける」かのどちらか一方が必ず起こるため、引き分けは数学的に不可能です。',
    },
    {
      q: '「2ブリッジ（Two-Bridge）」とは何ですか？',
      a: '2つの自分の石が、共通する2つの空きマスを介して斜め向かいにある形です。相手が片方の空きマスに割り込んできても、直ちにもう片方の空きマスに打てば必ず接続を守れるため、ヘックスにおける基本の連結テクニックとなります。',
    },
    {
      q: '「スワップルール」はどうやって使いますか？',
      a: '先手（赤）が1手目を打った直後の2手目のみ、後手（青）に「🔄スワップ宣言」ボタンが表示されます。押すと1手目の石が対角反転して青の石になり、手番が赤に移ります。',
    },
    {
      q: '無料で遊べますか？',
      a: 'はい。会員登録やインストール不要でブラウザから完全無料で遊べます。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ゲーム一覧',
      description: '定番ボードゲームやテーブルゲームをまとめて探す',
    },
    {
      href: '/checkers',
      label: 'チェッカー（3D/2D）',
      description: '斜めジャンプ捕獲とキング昇格で戦う伝統ボードゲーム',
    },
    {
      href: '/nine-mens-morris',
      label: 'ナイン・メンズ・モリス',
      description: '3つの石を並べて相手石を奪う古代ローマ起源の三目戦略盤',
    },
    {
      href: '/dots-and-boxes',
      label: 'ドット＆ボックス',
      description: '点と点を線で結んで四角い陣地を取り合う数学パズル盤',
    },
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

const pageTitle = `${game.name}｜引き分けなしの六角形接続戦略無料ボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ヘックス',
    'Hex ボードゲーム',
    '六角形 ボードゲーム',
    'ジョン・ナッシュ ゲーム',
    'アブストラクトゲーム 無料',
    '接続ゲーム',
    'ブラウザ ボードゲーム',
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

export default function HexBoardPage() {
  return (
    <main className="bg-[#060a14]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <HexBoardGame />
      <SeoContentSection
        variant="dark"
        eyebrow="BOARD GAME GUIDE"
        title={`${game.name}の特徴とルール・遊び方`}
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
