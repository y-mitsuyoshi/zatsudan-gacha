import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import MancalaGame from '@/components/board/mancala/MancalaGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/mancala',
  name: 'マンカラ（カラハ・種まき頭脳ボードゲーム）',
  h1: 'マンカラ（カラハ＆ベーシック）無料ブラウザゲーム｜AI対戦・2人対戦対応の種まき頭脳ボードゲーム',
  description:
    '世界最古級の伝統的な種まき頭脳ボードゲーム「マンカラ（Mancala）」を無料ブラウザでプレイ！連続手番と横取りキャプチャーでゴールストアの石数を競う「カラハ（Kalah）」と、先に自陣の6ポケットを空にする「ベーシック」の2大ルールに対応。1歩ずつ石が跳ねる種まきアニメーション、着地予測プレビュー、待った、AIヒント、初級・中級・上級のCPU対戦＆2人対戦を搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'マンカラ', 'カラハ', '知育・思考型ゲーム'],
  features: [
    {
      title: '「カラハ（高戦略）」と「ベーシック（先空け）」の2大ルール収録',
      text: 'ゴールストアの獲得石数を競い横取りキャプチャーも狙える本格派「カラハ（Kalah）」ルールと、先に自陣6ポケットの石をすべてなくした方が勝つ「ベーシック」ルールをワンタップで切り替えられます。',
    },
    {
      title: '1ポケットずつ石が移動する分かりやすい種まきアニメーション',
      text: '選んだポケットから反時計回りに1個ずつカラフルなジェムストーンが配られていく様子をステップアニメーションで表示。初めての方やお子様でも石の動きを直感的に追えます。',
    },
    {
      title: 'ホバー＆タップ前の「最後の石の着地予測プレビュー」',
      text: 'ポケットにカーソルを合わせると、最後の石がどこに落ちるか、「ぴったりゴールで連続手番になるか」「横取りキャプチャーが発生するか」を事前にハイライト表示します。',
    },
    {
      title: '連続手番チェインまで読み切る3段階AI＆1台2人対戦',
      text: '初級・中級・上級のCPU AIを搭載。上級AIはぴったりゴールによる連続手番コンボや横取りの罠まで先読みします。スマホやPC1台での対面2人プレイも可能です。',
    },
    {
      title: '初期石数（3個・4個・6個）のカスタマイズに対応',
      text: '短時間で決着がつく3個モード、標準の4個モード、長手数の読み合いになる6個モードを選択でき、気分やレベルに合わせて対局できます。',
    },
    {
      title: '「待った」と「AIヒント」で種まきパズルを攻略',
      text: '迷った時は「AIヒント」で最善のポケットを表示。「待った」で前の手番に戻して別の種まき手順を試すこともできます。',
    },
  ],
  steps: [
    {
      title: 'ルール（カラハ / ベーシック）と対戦モードを選択',
      text: 'ストアの石数を競う「カラハ」か、自陣を先に空にする「ベーシック」を選び、CPU対戦または2人対戦を選択します。',
    },
    {
      title: '自分の陣地（下段 A1〜A6）のポケットを1つ選ぶ',
      text: '石が入っているポケットをタップすると、中の石をすべて取り出し、反時計回りに1個ずつ隣のポケットへ配っていきます。',
    },
    {
      title: 'ぴったりゴールで連続手番＆空ポケットで横取り',
      text: '最後の石が自分のゴールストアに入ると、続けてもう1回手番を行えます。カラハルールでは自陣の空ポケットに最後の石が入ると、向かい側の相手石を横取りできます。',
    },
    {
      title: '片側の6ポケットがすべて空になったら決着',
      text: 'ベーシックでは先に自陣を空にしたプレイヤーの即勝利。カラハでは残った石をそれぞれのストアへ回収し、ストア内の石が多いプレイヤーの勝利となります。',
    },
  ],
  faqs: [
    {
      q: 'マンカラは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で何度でも遊べます。アプリのダウンロードや会員登録は不要です。',
    },
    {
      q: '「カラハ」と「ベーシック」の違いは何ですか？',
      a: '「カラハ」は横取りキャプチャーがあり、ゲーム終了時にゴールストアに集めた石の数が多い方が勝つ戦略ルールです。「ベーシック」は横取りがなく、先に自分の陣地（6つのポケット）の石をすべて0個にした方が即座に勝利するスピードルールです。',
    },
    {
      q: '「ぴったりゴール（連続手番）」のコツはありますか？',
      a: 'ゴールストアまでの距離とポケット内の石の数が一致する場所（例：右端のA6に1個、A5に2個、A4に3個、A3に4個…）から種まきを始めると、最後の石がぴったりストアに入り、もう1回連続で手番を行えます。',
    },
    {
      q: '横取りキャプチャーはどんな時に発生しますか？',
      a: 'カラハルールにおいて、種まきの最後の1個が「自分の陣地の空（0個）だったポケット」に入り、かつ「その正面（向かい側）の相手ポケットに1個以上の石がある」ときに発動します。',
    },
    {
      q: 'スマートフォンやタブレットで2人対戦はできますか？',
      a: 'はい。「1台で2人対戦」モードを選ぶと、下段（先手・P1）と上段（後手・P2）を交互にタップして1台の端末で対面プレイが楽しめます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームやアクションゲームをまとめて探す' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/qubic-four', label: '立体四目並べ 3D（Qubic 4×4×4）', description: 'Three.jsで遊べる4×4×4の3D空間重力四目並べ' },
    { href: '/gomoku', label: '五目並べ（15×15 連珠・五目戦略盤）', description: '形勢判断＆リーチ検知付きの本格15×15五目並べ' },
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

const pageTitle = `${game.name}｜カラハ＆ベーシック対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'マンカラ',
    'Mancala',
    'カラハ',
    'Kalah',
    'マンカラ 無料',
    '種まきゲーム',
    'ボードゲーム ブラウザ',
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

export default function MancalaPage() {
  return (
    <main className="bg-[#0c0906]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <MancalaGame />
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
