import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import GomokuGame from '@/components/board/gomoku/GomokuGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/gomoku',
  name: '五目並べ（15×15 連珠・五目戦略盤）',
  h1: '五目並べ 無料ブラウザゲーム｜15×15本格盤・リーチ検知・AI対戦＆2人対戦対応',
  description:
    '伝統の15×15榧（かや）目調碁盤で遊べる無料ブラウザ五目並べゲーム。星・天元・座標（A〜O / 1〜15）付きの美しい盤面に、活四・止め四・活三をリアルタイム解析する「形勢判断・リーチ検知バー」、手数表示切替、待った、AI推奨手ヒント、初級・中級・上級のCPU対戦と1台2人対戦を搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '五目並べ', '連珠', 'テーブルゲーム'],
  features: [
    {
      title: '星・天元・座標付きの美しい15×15榧（かや）目調碁盤',
      text: '視認性に優れた15路盤（225交点）にA〜O・1〜15の座標と9つの星（中央の天元含む）を配置。立体感のある黒石・白石と小気味よい碁石音で本格的な対局感を楽しめます。',
    },
    {
      title: 'リアルタイム「形勢判断・リーチ検知バー」',
      text: '盤上の「活四（両側空き4連）」「四（片側空きリーチ）」「活三（両側空き3連）」を自動でカウントして形勢バーと警告アラートで通知。うっかり見落としによる頓死を防げます。',
    },
    {
      title: '初級・中級・上級の3段階AIと1台2人対戦',
      text: '攻守の急所（四ノビ、活三止め、四三・三々のフォーク狙い）を評価するAIとソロ対戦が可能。さらにスマホやタブレット1台を囲んでの対面2人プレイにも対応しています。',
    },
    {
      title: '手数ナンバー表示切替と棋譜ログ',
      text: 'ワンタップで碁石の上に第1手からの手数番号を表示可能。右側の棋譜ログと合わせて、どの順番で石が並んだかをいつでも振り返れます。',
    },
    {
      title: '「待った」と「AI推奨手ヒント」を完備',
      text: '攻め筋や受け方に迷った時は「AI推奨手」ボタンで最善の交点を点滅ガイド。「待った」で前の手番に戻して研究することも可能です。',
    },
    {
      title: '登録不要・PC＆スマホで即対局開始',
      text: 'ブラウザで開くだけでインストール不要ですぐに遊べます。拡大やズレのないレスポンシブSVG盤面で快適にタップ・クリック操作が行えます。',
    },
  ],
  steps: [
    {
      title: '対戦モードとAIレベルを選ぶ',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選び、先手（黒）か後手（白）を選択します。',
    },
    {
      title: '15×15の交点をタップして碁石を打つ',
      text: '黒（先手）から交互に空いている交点へ石を置きます。初手は盤面中央の「天元（H8）」付近に打つのがセオリーです。',
    },
    {
      title: '形勢判断バーとリーチ警告をチェック',
      text: '相手が「活三」や「四（リーチ）」を作った時は上部アラートに表示されます。手遅れになる前に端をブロックしましょう。',
    },
    {
      title: '縦・横・斜めに5つ並べれば勝利',
      text: '先に自分の石を縦・横・斜めのいずれかに5個連続で並べたプレイヤーの勝利となります。',
    },
  ],
  faqs: [
    {
      q: '五目並べは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で何度でも遊べます。会員登録やアプリのインストールは不要です。',
    },
    {
      q: '「活四（かつし）」と「止め四（四）」の違いは何ですか？',
      a: '「活四」は4連の両端が空いている状態で、相手が片方を防いでも次の手で反対側に打てば5連になるため確定勝利の形です。「止め四」は片側だけが空いている4連（リーチ）で、相手は直ちにその1箇所を塞ぐ必要があります。',
    },
    {
      q: '勝つためのコツはありますか？',
      a: '単に1本のラインを伸ばすだけでは相手に止められてしまいます。1つの石で2方向の「活三」や「四と活三（四三）」を同時に作る交点を狙うと、相手は片方しか防げず勝利できます。',
    },
    {
      q: '手数表示とは何ですか？',
      a: '盤上の各碁石に「1, 2, 3...」と打たれた順番を表示する機能です。画面上部の「手数表示 ON/OFF」ボタンからいつでも切り替えられます。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。スマートフォン・タブレット・PCすべてに対応しています。交点をタップするだけで正確に石を配置できます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームやアクションゲームをまとめて探す' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/qubic-four', label: '立体四目並べ 3D（Qubic 4×4×4）', description: 'Three.jsで遊べる4×4×4の3D空間重力四目並べ' },
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

const pageTitle = `${game.name}｜リーチ検知＆AI対戦対応の無料ブラウザ五目並べ`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '五目並べ',
    '五目並べ 無料',
    '五目並べ AI',
    '連珠',
    '15路盤',
    'ボードゲーム ブラウザ',
    '2人対戦 五目並べ',
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

export default function GomokuPage() {
  return (
    <main className="bg-[#0b0907]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <GomokuGame />
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
