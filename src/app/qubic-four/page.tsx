import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import QubicFourGame from '@/components/board/qubic-four/QubicFourGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/qubic-four',
  name: '立体四目並べ 3D（Qubic 4×4×4）',
  h1: '立体四目並べ 3D（Qubic 4×4×4）｜Three.jsで遊べる無料3D空間重力ボードゲーム',
  description:
    '16本の垂直ポールに球を落として4×4×4の3D空間（全76ライン）で4連を作る無料ブラウザボードゲーム「立体四目並べ 3D（Qubic 4×4×4）」。Three.jsによる360度回転可能な立体ボードと1段目〜4段目の2D断面ミニマップを同期表示。リーチ警告、待った、AIヒント、初級・中級・上級のCPU対戦＆2人対戦に対応しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '立体四目並べ', '3Dパズル', '空間頭脳戦'],
  features: [
    {
      title: 'Three.jsによる4×4×4フル3D立体ボードと自由なカメラ回転',
      text: '16本のポールに最大4段まで球が積み重なる全64マスの立体空間をThree.jsで描画。ドラッグ操作による360度回転に加え、正面・斜め上・真上・自動回転のカメラプリセットをワンタップで切り替えられます。',
    },
    {
      title: '3Dボードと連動する「1段目〜4段目 2D断面スライスマップ」',
      text: '奥行きや重なりで見えにくい箇所も、右側の1段目〜4段目スライスマップで一目瞭然。3Dポールでも2Dスライスマップでもどちらをタップしても球を投下できます。',
    },
    {
      title: '全76通りの勝利ライン（縦・横・高さ・平面斜め・3D空間対角線）',
      text: '水平・垂直の直線だけでなく、各断面の斜めラインや立方体の中心を貫く4本の3D空間対角線まで全76ラインを自動判定。勝利時は3D空間にレーザーラインが輝きます。',
    },
    {
      title: '見落としを防ぐリアルタイム「リーチ警告」表示',
      text: '3D空間上でどちらかのプレイヤーが3連（あと1球で4連完成）を作ると、リーチ座標と段数、さらに今すぐ着手可能な状態か空中待ち状態かをリアルタイムに警告します。',
    },
    {
      title: '76ライン空間評価AI（初級・中級・上級）＆1台2人対戦',
      text: '1人プレイでは初級・中級・上級の3段階AIと対戦可能。上級AIは自分のリーチ構築だけでなく、「うっかり下に置いて相手の4連をアシストしてしまう手」も回避して読み合います。',
    },
    {
      title: '「待った」と「AIヒント」で立体思考をトレーニング',
      text: '空間把握が難しい場面でも「AIヒント」で最善の投下ポールを確認可能。「待った」で1手戻して別のラインを試すこともできます。',
    },
  ],
  steps: [
    {
      title: '対戦モードとカメラ視点を設定',
      text: '「CPU対戦（初級・中級・上級）」または「1台で2人対戦」を選択します。先手（アンバー）と後手（サファイア）も自由に選べます。',
    },
    {
      title: '3Dポールまたは2Dスライスマップをタップして球を投下',
      text: '16本のポールのいずれかを選ぶと、重力に従ってそのポールの最も低い空き段（1段目〜4段目）に球が落下します。',
    },
    {
      title: 'カメラ回転とリーチ警告で立体ラインを把握',
      text: '画面をドラッグして角度を変えたり、2D断面マップを見比べたりして、相手の斜め3連や空間対角線の狙いをブロックしましょう。',
    },
    {
      title: '縦・横・高さ・斜めのいずれかで4連を作れば勝利',
      text: '全76ラインのうち先に自分の球を4つ一直線に並べたプレイヤーの勝利となります。',
    },
  ],
  faqs: [
    {
      q: '立体四目並べ 3D（Qubic 4×4×4）は無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で遊べます。ダウンロードや会員登録は不要です。',
    },
    {
      q: '空中の段（2段目や3段目）に直接球を置くことはできますか？',
      a: 'いいえ。重力ルールのため、球は選んだポールの1段目（最下段）から順番に積み上がります。上の段に置きたい場合は、まず下の段を埋める必要があります。',
    },
    {
      q: '全部で何通りの勝ち方（4連ライン）がありますか？',
      a: '4×4×4の立方体には、横16本・奥行き16本・縦（高さ）16本・各平面の斜め24本・立方体を貫く3D空間対角線4本の合計76通りの勝利ラインがあります。',
    },
    {
      q: '奥のポールが重なってタップしづらい時はどうすればいいですか？',
      a: '3D画面をドラッグして視点を回転させるか、画面横（スマホでは下部）にある「2D LAYER SLICE MAP（1段目〜4段目）」のマスを直接タップして投下できます。',
    },
    {
      q: '勝つためのコツはありますか？',
      a: '立方体の中央付近（2段目・3段目の内側4マス）は空間対角線を含む多くのラインが交差する要衝です。また、相手の上段リーチの下に不用意に球を置かないよう注意しましょう。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームやアクションゲームをまとめて探す' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/gomoku', label: '五目並べ（15×15 連珠・五目戦略盤）', description: '形勢判断＆リーチ検知付きの本格15×15五目並べ' },
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

const pageTitle = `${game.name}｜Three.jsで遊べる無料3D空間重力ボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '立体四目並べ',
    '3D四目並べ',
    'Qubic',
    '4x4x4',
    'ボードゲーム 無料',
    'Three.js ゲーム',
    '空間パズル',
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

export default function QubicFourPage() {
  return (
    <main className="bg-[#060913]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <QubicFourGame />
      <SeoContentSection
        variant="dark"
        eyebrow="3D BOARD GAME GUIDE"
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
