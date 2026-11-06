import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import AbyssalSalvageGame from '@/components/board/abyssal-salvage/AbyssalSalvageGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/abyssal-salvage',
  name: '深海サルベージ：酸素限界の遺跡探査（Abyssal Salvage）',
  h1: '深海サルベージ：酸素限界の遺跡探査｜無料ブラウザ深海チキンレース＆リスク管理ボードゲーム',
  description:
    '全3回の潜水で深海遺跡の遺物と古代コアを回収し、母艦金庫へ持ち帰る無料ブラウザ深海チキンレース＆リスク管理ボードゲーム。4名の潜水艇操縦士（あなた＋性格の異なる3名のAIライバル）が各深度で同時に「さらに潜行する」か「母艦へ帰還する」を決断！同じ種類の深海災害カードが2枚出る前に撤退するか、単独帰還ボーナスを狙うかの心理戦とリアルタイム確率・期待値アナライザーを搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', 'チキンレース', '確率・リスク管理', 'テーブルゲーム'],
  features: [
    {
      title: '「さらに潜行」か「母艦へ帰還」かの同時決断チキンレース',
      text: '各深度ステップで生存中の全ダイバーが同時に進退を選択。潜行を続ければ新たな深海遺物を山分けできますが、同じ種類の深海災害に2回遭遇すると強制浮上（バースト）となり、未格納の調査バッグ遺物をすべて失います。',
    },
    {
      title: '海溝端数の回収と「単独帰還ボーナス（古代コア）」の駆け引き',
      text: '山分けで割り切れなかった端数ポイントは海溝ルート上に残り、帰還を選んだダイバーで分配します。さらに各潜水で追加される「古代コア（+5pt / +8pt / +12pt）」は、ただ1人で単独帰還した操縦士だけが独占回収できます。',
    },
    {
      title: 'リアルタイム「深海ソナー確率アナライザー（EV計算機）」搭載',
      text: '残存デッキ枚数と出現済み第1警報（リーチ）から、「次の深度で強制浮上する確率（%）」「安全に遺物を引く確率（%）」「帰還時の確定スコア vs 潜行続行の期待値（EV）」をリアルタイムで数理表示します。',
    },
    {
      title: '5種類の深海災害とデッキ圧縮システム',
      text: '「熱水噴出」「巨大発光クラゲ」「海溝崩落」「強潮流渦」「高圧磁気嵐」の5種の災害カードが各3枚ずつ潜んでいます。2枚目が出現して強制浮上を引き起こした災害カードはデッキから永久排除され、後半ラウンドの確率構造が変化します。',
    },
    {
      title: '思考アルゴリズムが異なる3名の個性派AI操縦士',
      text: '警報が出ると堅実に撤退する「慎重派ナビゲーター（ミオ）」、深層の大型遺物を狙う「強欲トレジャーハンター（ガルド）」、期待値と単独帰還タイミングを計算する「確率計算アナリスト（ケイ）」と白熱の駆け引きを楽しめます。',
    },
    {
      title: '登録不要・PC＆スマホ対応の深海ソナーUI＆効果音',
      text: 'Web Audioシンセサイザーによるソナーピング音・遺物チャイム・緊急警報サウンド（消音切替対応）とカスタムSVGカードアートを備え、ブラウザですぐに無料で遊べます。',
    },
  ],
  steps: [
    {
      title: '第1潜水を開始して最初の深度へ',
      text: '全3回の潜水ラウンドで行われます。まずはハッチを開放して第1潜水を開始し、深度100mのカードをめくります。',
    },
    {
      title: 'ソナー確率アナライザーで危険度と期待値を確認',
      text: '第1警報（リーチ）が出ている災害の種類、次の深度でのバースト確率、海溝上に残っている端数ポイントと古代コアを確認します。',
    },
    {
      title: '「さらに潜行する」か「母艦へ帰還する」を決断',
      text: 'さらに深い遺物を狙うなら「さらに潜行する」、調査バッグの遺物と海溝端数を確実に金庫へロックするなら「母艦へ帰還する」を選択します。',
    },
    {
      title: '全3潜水の合計母艦金庫スコアで1位を目指す',
      text: '第3潜水終了時点で、母艦金庫に確定格納した合計ポイントが最も高い操縦士の勝利となります。自己ベスト記録もブラウザに自動保存されます。',
    },
  ],
  faqs: [
    {
      q: '「深海サルベージ：酸素限界の遺跡探査」は無料で遊べますか？',
      a: 'はい。PC・タブレット・スマートフォンのブラウザから登録不要・完全無料で何度でもプレイできます。',
    },
    {
      q: 'どんな条件で強制浮上（バースト）になりますか？',
      a: '5種類ある深海災害（熱水噴出・巨大発光クラゲ・海溝崩落・強潮流渦・高圧磁気嵐）のうち、同じラウンド中に「同じ種類の災害カードの2枚目」がめくられた瞬間に強制浮上となります。1枚目（第1警報）の時点ではまだバーストしません。',
    },
    {
      q: '海溝に残った端数ポイントや「古代コア」はどうすれば獲得できますか？',
      a: '遺物ポイントを潜行中の人数で割った余り（海溝端数）は、「母艦へ帰還する」を選んだ操縦士たちで均等に山分けして回収できます。一方、「古代コア（+5pt〜+12pt）」は、その深度で「1人だけが単独で母艦へ帰還したとき」にのみ独占回収できます。',
    },
    {
      q: '勝つためのコツ・戦略はありますか？',
      a: '第1警報が0件のうちはバースト確率が0%なので強気に潜行できます。警報が2〜3種類溜まったらソナー確率アナライザーの「バースト確率」と「海溝残留端数＋古代コア」を確認し、他のAIより1手早く単独帰還を決めると一気に大量得点を稼げます。',
    },
    {
      q: '効果音を消して遊ぶことはできますか？',
      a: 'はい。画面上部の「ソナー音ON / 消音中」ボタンからワンタップでいつでもミュート切り替えが可能です。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームや思考型ゲームをまとめて探す' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/mancala', label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）', description: 'カラハ＆ベーシックの2ルール対応の種まき頭脳戦' },
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

const pageTitle = `${game.name}｜確率アナライザー搭載の無料深海チキンレースボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '深海サルベージ',
    'Abyssal Salvage',
    'チキンレース ボードゲーム',
    '確率 ボードゲーム 無料',
    'リスク管理 ゲーム',
    '深海探査 ゲーム',
    'ブラウザ ボードゲーム 無料',
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

export default function AbyssalSalvagePage() {
  return (
    <main className="bg-[#030914]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <AbyssalSalvageGame />
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
