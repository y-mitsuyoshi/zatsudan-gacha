import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import CheckersGame from '@/components/board/checkers/CheckersGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/checkers',
  name: 'チェッカー（ドラフツ・3D/2D盤）',
  h1: 'チェッカー（ドラフツ）無料ブラウザボードゲーム｜3D/2D切替・連続ジャンプ・AI＆2人対戦',
  description:
    '世界中で親しまれる伝統の8×8斜めジャンプ捕獲ボードゲーム「チェッカー（English Draughts）」をブラウザで無料プレイ！Three.jsによる立体3D木製ボードと視認性に優れた2D平面ボードをワンタップで切替可能。強制ジャンプON/OFF、連続ジャンプ、キング昇格、初級・中級・上級AI対戦、1台での2人対戦、ヒント・待った機能を搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'チェッカー', '頭脳戦略'],
  features: [
    {
      title: 'Three.js 3D立体盤面と2D平面盤面を自在に切替',
      text: '立体感あふれる3D木製ボード＆王冠付きキング駒ビューと、スマートフォンでも素早く正確に指せる2Dトップダウン盤面を対局中いつでも切り替えられます。',
    },
    {
      title: '連続ジャンプ捕獲と強制ジャンプルール対応',
      text: '相手の駒を斜めに飛び越えて捕獲し、着地後にさらに飛び越えられる駒があれば連続ジャンプが発動！公式ルールの「強制ジャンプ（Mandatory Jump）」もON/OFF切替可能です。',
    },
    {
      title: '最奥列到達で前後自在のキングへ昇格',
      text: '相手陣地の最奥列まで進んだ駒は王冠（👑）を戴くキングに昇格。斜め前方だけでなく斜め後方にも移動・ジャンプ捕獲が可能になり、終盤の逆転劇を生み出します。',
    },
    {
      title: 'ミニマックス探索AI（初級・中級・上級）搭載',
      text: 'キング価値・後列防衛・中央制圧・連続捕獲を評価する本格AIと対戦可能。初心者向けの「初級」から先読みを行う「上級」まで3段階から選べます。',
    },
    {
      title: '1台で2人対戦（パス＆プレイ）に対応',
      text: 'スマートフォンやタブレット、PC1台を囲んで赤（先手）と白（後手）のローカル2人対戦がすぐに楽しめます。',
    },
    {
      title: 'AI戦術ヒントと待った（Undo）・棋譜ログ',
      text: '迷ったときに最善手と理由を教えてくれる「💡ヒント」機能や、1手戻せる「待った」機能、対局の流れを振り返れる棋譜ログを完備しています。',
    },
  ],
  steps: [
    {
      title: '対戦モードと盤面表示（3D/2D）を選ぶ',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選択し、好みに合わせて3D立体盤面と2D平面盤面を切り替えます。',
    },
    {
      title: '自分の駒を選択して斜め前方へ進める',
      text: '赤（先手）からスタートします。自分の駒をタップすると移動可能な斜め前方の黒マスが緑色にハイライトされます。',
    },
    {
      title: '相手の駒を飛び越えて連続ジャンプ捕獲',
      text: '斜め隣に相手の駒があり、そのすぐ奥の黒マスが空いている場合はジャンプして相手駒を捕獲できます。続けて飛べる場合は連続ジャンプになります。',
    },
    {
      title: 'キングに昇格させて相手駒を全滅させる',
      text: '最奥列に到達してキング（👑）に昇格させ、相手の駒をすべて捕獲するか、相手の合法手をなくせば勝利です。',
    },
  ],
  faqs: [
    {
      q: 'チェッカー（ドラフツ）は無料で遊べますか？',
      a: 'はい。ブラウザ上で登録不要・完全無料で何度でも遊べます。',
    },
    {
      q: '「強制ジャンプ」とはどのようなルールですか？',
      a: 'チェッカーの公式ルールでは、相手の駒を飛び越えて捕獲できる手がある場合、必ずジャンプ捕獲を選ばなければなりません。本ゲームでは初心者向けに強制ジャンプをOFFにする設定も用意しています。',
    },
    {
      q: 'キングに昇格したターンにそのまま後ろへ連続ジャンプできますか？',
      a: 'イングリッシュ・ドラフツ（アメリカン・チェッカー）の公式ルールに準拠し、通常駒が最奥列に到達してキングに昇格した瞬間はその手番が終了し、次の手番から斜め前後へ動けるようになります。',
    },
    {
      q: 'スマートフォンでも3Dモードは動きますか？',
      a: 'はい。モバイルブラウザのタッチ操作とDPR解像度に最適化されており、カメラアングル切替や2Dモードへのワンタップ切替にも対応しています。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ゲーム一覧',
      description: '定番ボードゲームやテーブルゲームをまとめて探す',
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

const pageTitle = `${game.name}｜3D/2D対応・AI＆2人対戦の無料ボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'チェッカー',
    'ドラフツ',
    'Checkers',
    'Draughts',
    'ボードゲーム 無料',
    'ブラウザゲーム',
    '3D チェッカー',
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

export default function CheckersPage() {
  return (
    <main className="bg-[#070b14]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <CheckersGame />
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
