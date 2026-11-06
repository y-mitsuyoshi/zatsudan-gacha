import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import ReversiGame from '@/components/board/reversi/ReversiGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/reversi',
  name: 'リバーシ（Reversi 3D / 2D）',
  h1: 'リバーシ（Reversi）無料ブラウザゲーム｜3D/2D切替・AI対戦＆2人対戦対応の8×8挟み反転ボードゲーム',
  description:
    '19世紀英国発祥の伝統的な8×8挟み反転ボードゲーム「リバーシ（Reversi）」を無料ブラウザでプレイ！Three.jsによる立体3D盤面と視認性に優れた2D盤面をワンタップで切り替え可能。初級・中級・上級の本格CPU AI対戦と1台での2人対戦、反転枚数ガイド、待った、AI最善手ヒントを搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'リバーシ', 'テーブルゲーム', '思考型パズル'],
  features: [
    {
      title: 'Three.js 立体3D盤面と2D盤面をワンタップ切替',
      text: '木枠とグリーンのフェルト盤面上で黒白の2色ディスクが物理的に180度回転して裏返る3Dモードと、スマートフォンでも見やすい2Dモードをいつでも切り替えられます。',
    },
    {
      title: '初級・中級・上級の3段階AIと1台2人対戦',
      text: '手軽な初級から、位置評価と着手可能数（モビリティ）を読む中級、αβ枝刈りミニマックス探索で角や確定石を狙う上級AIまで搭載。対面での2人プレイにも対応しています。',
    },
    {
      title: '合法手ハイライトと反転枚数のリアルタイムプレビュー',
      text: '現在置けるマスがハイライト表示され、何枚の石が反転するかが一目でわかります。マウスオーバーやタップ前に戦局の変化を確認できます。',
    },
    {
      title: '「待った」と「AI最善手ヒント」で上達をサポート',
      text: 'うっかり悪手を打ってしまった時は「待った」で前の手番に戻せます。迷った時は「AIヒント」を押すと上級AIが推奨する最善手の座標を提案します。',
    },
    {
      title: '黒白の勢力バーとリアルタイム集計',
      text: '黒石・白石の枚数、残り空きマス数、現在の支配率パーセンテージをリアルタイムに表示。終盤の石数計算も直感的に把握できます。',
    },
    {
      title: '登録不要・ブラウザですぐ遊べる快適設計',
      text: 'PC・タブレット・スマートフォンのブラウザで開くだけですぐに対局開始。カメラアングル切替や効果音ON/OFFも備えています。',
    },
  ],
  steps: [
    {
      title: '対戦モードとAIレベルを選択',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選び、CPU対戦時は先手（黒）か後手（白）を選択します。',
    },
    {
      title: '3D盤面または2D盤面で合法手を確認',
      text: '相手の石を縦・横・斜めのいずれかで挟めるマス（合法手）がハイライト表示されます。',
    },
    {
      title: 'マスをタップして石を配置・反転',
      text: '置きたいマスをタップすると石が置かれ、挟んだ相手の石が一斉に自分の色へ反転します。置ける場所がない場合は自動パスとなります。',
    },
    {
      title: '最終枚数が多いプレイヤーの勝利',
      text: '64マスすべてが埋まるか、双方とも置ける場所がなくなった時点で対局終了。石の数が多い方の勝利となります。',
    },
  ],
  faqs: [
    {
      q: 'リバーシ（Reversi）は無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で何度でも遊べます。アプリのインストールや会員登録は一切不要です。',
    },
    {
      q: '3Dモードと2Dモードは対局の途中で切り替えられますか？',
      a: 'はい。画面上部の「3D盤面 / 2D盤面」ボタンから、対局の進行状態を保ったままいつでも自由に切り替えられます。',
    },
    {
      q: 'リバーシで勝つためのコツはありますか？',
      a: '四隅の角（A1, H1, A8, H8）は一度取ると絶対に裏返されないため最優先で狙いましょう。また、序盤は自分の石を増やしすぎず、相手の置ける場所を制限するのがセオリーです。',
    },
    {
      q: '置けるマスが1つもない場合はどうなりますか？',
      a: '合法手が存在しない場合はルールに従い自動的に「パス」となり、相手の手番に移ります。双方とも置けなくなった場合はその時点で集計・終局となります。',
    },
    {
      q: 'スマートフォンでも快適に操作できますか？',
      a: 'はい。3D盤面ではドラッグで視点回転・タップで石の配置が可能で、2D盤面では大きなマス目で片手でも快適にタップ操作できます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームやアクションゲームをまとめて探す' },
    { href: '/qubic-four', label: '立体四目並べ 3D（Qubic 4×4×4）', description: 'Three.jsで遊べる4×4×4の3D空間重力四目並べ' },
    { href: '/gomoku', label: '五目並べ（15×15 連珠・五目戦略盤）', description: 'リーチ検知＆AIヒント付きの本格15×15五目並べ' },
    { href: '/mancala', label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）', description: 'カラハ＆ベーシックの2ルール対応の種まき頭脳戦' },
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

const pageTitle = `${game.name}｜3D/2D切替・AI対戦対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'リバーシ',
    'Reversi',
    'リバーシ 無料',
    '3Dリバーシ',
    'ボードゲーム ブラウザ',
    'AI対戦 リバーシ',
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

export default function ReversiPage() {
  return (
    <main className="bg-[#070b14]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <ReversiGame />
      <SeoContentSection
        variant="dark"
        eyebrow="BOARD GAME GUIDE"
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
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
