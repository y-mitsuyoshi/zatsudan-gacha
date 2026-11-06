import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import DotsAndBoxesGame from '@/components/board/dots-and-boxes/DotsAndBoxesGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/dots-and-boxes',
  name: 'ドット＆ボックス（陣取り線引きパズル盤）',
  h1: 'ドット＆ボックス無料ボードゲーム｜点と点を線で結ぶ陣取り頭脳戦・AI＆2人対戦',
  description:
    '19世紀フランスの数学者エドゥアール・リュカが考案した名作陣取りボードゲーム「ドット＆ボックス（Dots and Boxes / La Pipopipette）」をブラウザで無料プレイ！隣り合うドットを線で結び、1×1ボックスの4辺目を完成させると陣地獲得＆連続ボーナスターン！3×3・4×4・5×5サイズ切替、リアルタイムチェーン解析、ダブルクロス戦術AI（初級・中級・上級）、1台での2人対戦に対応しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '陣取りゲーム', '数学パズル'],
  features: [
    {
      title: 'ボックス完成で即座に「もう1手（ボーナスターン）」発動',
      text: '正方形の4辺目を引いてボックスを完成させると自分の陣地になり、そのまま連続して次の線を引くことができます。連鎖（チェーン）が繋がれば一挙大量得点のチャンス！',
    },
    {
      title: '3×3・4×4・5×5の3種類のグリッドサイズに対応',
      text: '手軽に遊べる3×3ボックス（9マス）から、標準の4×4ボックス（16マス）、本格的な長連鎖が生まれる5×5ボックス（25マス）まで自由に切り替えられます。',
    },
    {
      title: 'リアルタイム盤面・チェーン解析パネル搭載',
      text: '現在盤上にある「安全な辺（相手にリーチを与えない辺）」の残り本数や「2辺済み警戒ボックス数」「最小献上チェーン長」をリアルタイムに数値化して表示します。',
    },
    {
      title: '「ダブルクロス（2マス献上）」を駆使する上級AI',
      text: '3辺目を安易に引かない基本戦術はもちろん、上級AIはチェーンの最後の2マスをあえて相手に譲り渡して次の大連鎖を奪う高等戦術「ダブルクロス」を実行します。',
    },
    {
      title: '1台で2人対戦（パス＆プレイ）に完全対応',
      text: '紙と鉛筆がなくても、スマートフォンやタブレット1台で友達や家族とすぐに対戦できます。',
    },
    {
      title: 'ボックス辺数ガイド表示・AI戦術ヒント・待った機能',
      text: '各ボックスが現在何辺埋まっているか（0/4〜3/4）を視覚的にガイド表示。迷ったときは最善手と理由を示す「💡ヒント」や「↩待った」が使えます。',
    },
  ],
  steps: [
    {
      title: 'グリッドサイズ（3×3 / 4×4 / 5×5）と対戦モードを選ぶ',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選択し、盤面サイズを決めます。',
    },
    {
      title: '隣り合うドット間の破線をタップして線を引く',
      text: '縦または横のドット間をタップすると線が引かれます。ボックスの4辺目を完成させない限り、1本引くと相手の手番に移ります。',
    },
    {
      title: '4辺目を引いてボックス獲得＆ボーナスターンで連鎖',
      text: 'すでに3辺が引かれたボックスの4辺目を引くと自分の陣地になり、続けてもう1本線を引く権利（ボーナスターン）を得ます。',
    },
    {
      title: '過半数のボックスを獲得して勝利',
      text: 'すべての線が引かれた時点で、より多くのボックスを獲得していたプレイヤーの勝利です。',
    },
  ],
  faqs: [
    {
      q: '1本の線で2つのボックスを同時に完成させた場合、ボーナスターンは2回になりますか？',
      a: '公式ルールにより、1本の線で2つのボックスを同時に獲得した場合も、与えられるボーナスターン（追加の1手）は1回です。ただしその2ボックス両方が自分の得点になります。',
    },
    {
      q: '「ダブルクロス（Double-Cross）」とはどのような戦術ですか？',
      a: '終盤に安全な辺がなくなった際、自分が取っているチェーンの最後の2ボックスをあえて取らずに間の線を引くことで、相手にその2ボックスを強制的に取らせ、直後に相手から次の巨大チェーンを献上させる必勝テクニックです。',
    },
    {
      q: 'スマートフォンでも線を押し間違えませんか？',
      a: '各ドット間の線には幅広のタッチ判定エリアを設けており、スマートフォンの画面でもストレスなく正確にタップできます。万が一押し間違えても「↩待った」で戻せます。',
    },
    {
      q: '無料で遊べますか？',
      a: 'はい。登録やアプリインストール不要で、ブラウザ上で完全無料で遊べます。',
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
      href: '/hex-board',
      label: 'ヘックス（Hex）',
      description: '引き分けが存在しない六角形接続トポロジー戦略ゲーム',
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

const pageTitle = `${game.name}｜連鎖とダブルクロスで戦う無料陣取りボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ドットアンドボックス',
    'Dots and Boxes',
    '陣取りゲーム 無料',
    '線引きゲーム',
    '数学パズル ボードゲーム',
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

export default function DotsAndBoxesPage() {
  return (
    <main className="bg-[#060b14]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <DotsAndBoxesGame />
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
