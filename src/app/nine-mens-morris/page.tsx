import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import NineMensMorrisGame from '@/components/board/nine-mens-morris/NineMensMorrisGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/nine-mens-morris',
  name: 'ナイン・メンズ・モリス（古代ローマ三目戦略盤）',
  h1: 'ナイン・メンズ・モリス（ミル）無料ボードゲーム｜配置・移動・フライング3段階戦略AI＆2人対戦',
  description:
    '古代ローマや中世ヨーロッパで愛された人類最古級の伝統アブストラクト戦略ボードゲーム「ナイン・メンズ・モリス（Nine Men\'s Morris / ミル）」をブラウザで無料プレイ！3重の同心正方形と24の交点を舞台に、配置・移動・フライングの3フェーズと「ミル（三目）」成立による相手石の除去を駆使して勝利を目指します。初級・中級・上級AI対戦と1台での2人対戦に対応。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'アブストラクトゲーム', '頭脳戦略'],
  features: [
    {
      title: '配置・移動・フライングの劇的な3フェーズ進行',
      text: '手持ち9石を置く「配置フェーズ」、線に沿って隣へ動かす「移動フェーズ」、そして残り3石になった瞬間にどの空き交点へも飛べる「フライングフェーズ」の3段階が熱い駆け引きを生みます。',
    },
    {
      title: '「ミル（三目）」成立で相手の石を即座に除去',
      text: '縦または横の直線3交点に自分の石を揃えると「ミル」が発光！盤上の相手の石（原則としてミルを作っていない石）を1つ選んで取り除けます。',
    },
    {
      title: '往復ミル（ダブルミル）も狙える本格戦略AI',
      text: '交点の支配度・リーチ数・移動自由度を評価するCPU AI（初級・中級・上級）を搭載。1手ごとにミルを開閉して相手石を削る伝統の手筋も体験できます。',
    },
    {
      title: '1台で2人対戦（パス＆プレイ）に完全対応',
      text: 'スマートフォンやタブレット1台を交互に操作して、琥珀（先手）と青（後手）の2人対戦がいつでも楽しめます。',
    },
    {
      title: '発光ミルライン・合法手ハイライト・AIヒント',
      text: '現在成立しているミルラインが黄金・シアンに輝き、移動可能な交点や除去可能な相手石が一目でわかります。迷ったときは「💡ヒント」と「↩待った」がサポートします。',
    },
    {
      title: 'スマートフォン390px幅でも押しやすいSVG盤面',
      text: '24箇所すべての交点にゆとりあるタップ判定領域を設け、座標ラベル（A1〜G7）と対局ログで指し手を正確に確認できます。',
    },
  ],
  steps: [
    {
      title: 'フェーズ1：9個の石を交互に配置する',
      text: '最初は空いている24箇所の交点に1つずつ石を置いていきます。配置中から3つ並べば「ミル」が成立し、相手の石を除去できます。',
    },
    {
      title: 'フェーズ2：線に沿って隣の空き交点へ移動する',
      text: '9個すべて置き終えたら、自分の石をタップして選択し、線でつながった隣の空き交点へ動かして新たなミルを狙います。',
    },
    {
      title: 'ミル成立で相手の石を1つ除去する',
      text: '直線3連のミルが成立したら、赤枠でハイライトされた相手の石をタップして盤面から取り除きます。',
    },
    {
      title: 'フェーズ3：残り3石でフライング発動・決着',
      text: '石が3個に減ったプレイヤーは任意の空き交点へジャンプできる「フライング」が解禁！相手を残り2石にするか、動ける場所をなくせば勝利です。',
    },
  ],
  faqs: [
    {
      q: '相手のミル（3つ並んだ石）の中にある石は除去できますか？',
      a: '公式ルールにより、相手のミルに含まれていない石が盤上に1つでもある場合は、ミル外の石から優先して除去しなければなりません。相手のすべての石がミルの中にある場合のみ、ミル内の石も除去できます。',
    },
    {
      q: '一度作ったミルから石を1つ動かして、次の手番にまた戻してもミルになりますか？',
      a: 'はい！一度ミルを崩して次の手で再び3つ揃えた場合も、新しくミルが成立したものとして相手の石を1つ除去できます。特に2つのミルを行き来する「往復ミル（シャトルミル）」は必勝級の戦術です。',
    },
    {
      q: 'フライングとは何ですか？',
      a: '配置フェーズ終了後、自分の石が残り3個になったプレイヤーに与えられる逆転ルールです。線でつながっていない遠くの空き交点へも一手でジャンプして移動できるようになります。',
    },
    {
      q: '無料で遊べますか？',
      a: 'はい、登録やダウンロード不要でブラウザから完全無料で遊べます。',
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
      href: '/hex-board',
      label: 'ヘックス（Hex）',
      description: '引き分けが存在しない六角形接続トポロジー戦略ゲーム',
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

const pageTitle = `${game.name}｜ミル成立とフライングで戦う無料ボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ナインメンズモリス',
    'Nine Mens Morris',
    'ミル ボードゲーム',
    '古代ローマ ボードゲーム',
    'アブストラクトゲーム 無料',
    'ブラウザ ボードゲーム',
    '2人対戦 ボードゲーム',
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

export default function NineMensMorrisPage() {
  return (
    <main className="bg-[#070a12]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <NineMensMorrisGame />
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
