import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import DiceHarborGame from '@/components/board/dice-harbor/DiceHarborGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: GameSeoData = {
  slug: '/dice-harbor',
  name: 'サイコロ港町（ダイス・ハーバー）：出目で育つ交易都市',
  h1: 'サイコロ港町（ダイス・ハーバー）無料ブラウザボードゲーム｜ダイス発動＆都市建設・拡大再生産エンジン',
  description:
    'サイコロを振って港湾施設を発動させ、獲得したコインで街を広げるダイス発動＆都市建設ボードゲーム『サイコロ港町（ダイス・ハーバー）』を無料ブラウザでプレイ！誰の番でも生産する一次産業（青）、自分の番に稼ぐ商業施設（緑）、他人の番に通行料を得る歓楽街（赤）、ギルド（紫）を組み合わせ、4つの港湾モニュメント（双子灯台・蒸気鉄道駅・交易造船所・天空時計塔）の早期完成を競います。1ダイスvs2ダイス期待収益シミュレーター＆CPU対戦対応。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '都市建設ゲーム', 'ダイスゲーム', '拡大再生産'],
  features: [
    {
      title: '4色の港湾施設カードで組む拡大再生産ダイスエンジン',
      text: '誰の番でも出目で生産する「一次産業ブルーカード」、自分の番に高収入を生む「商業グリーンカード」、他人の番に通行料を徴収する「歓楽街レッドカード」、特殊効果を持つ「ギルドパープルカード」の全14種を組み合わせて自分だけの収益エンジンを構築できます。',
    },
    {
      title: '4つの港湾モニュメント建設で特殊能力が順次解放',
      text: '「双子灯台（1ダイス/2ダイス選択解放）」「蒸気鉄道駅（振り直し特権）」「交易造船所（商業・歓楽街+1G強化）」「天空時計塔（ゾロ目で追加ターン）」の4大モニュメントをすべて最初に完成させた港長が勝利します。',
    },
    {
      title: 'リアルタイム「1ダイス vs 2ダイス 期待収益シミュレーター」搭載',
      text: '現在の全プレイヤーの所有カードと所持金から、1ダイス（1〜6）と2ダイス（2〜12）それぞれの正確な数学的期待収益（EV）を自動計算。さらに市場で最も投資効率（EV/コスト）が高い施設カードをハイライト表示します。',
    },
    {
      title: '個性派AI（バランス型・1ダイス速攻型・2ダイス重工業型）＆2人対戦',
      text: '2〜4人でのCPU対戦では、低出目を重ねて素早く稼ぐ「1ダイス速攻型AI」や資源シナジーで一撃高配当を狙う「2ダイス重工業型AI」と対戦可能。1台の端末での対面2人プレイにも対応しています。',
    },
    {
      title: '「赤→青→緑・紫」の正確な自動収入解決とアニメーション',
      text: 'ダイス確定後、歓楽街の徴収（赤）→全員の資源生産（青）→手番者の商業・ギルド収入（緑・紫）の順に自動でハイライト処理され、各港長の収支変動がフローティング表示されます。',
    },
    {
      title: '登録不要・PC＆スマホのブラウザですぐに遊べる快適UI',
      text: '立体的なSVGダイスロール演出、所有枚数バッジ（×2、×3）、Web Audioによるダイス＆コイン効果音（ON/OFF切替可）を備え、スマートフォンでも片手で快適にプレイできます。',
    },
  ],
  steps: [
    {
      title: '対戦モードと参加人数（2〜4人）を選択',
      text: 'CPU対戦（2〜4人・AI戦略タイプ選択可）または1台での2人対戦を選んで交易シーズンを開始します。各プレイヤーは初期施設「潮風小麦畑[1]」と「港のパン工房[2・3]」を持ってスタートします。',
    },
    {
      title: 'ダイスロールフェーズ（1個 または 2個）',
      text: '手番プレイヤーがダイスを1個（1〜6）振ります。「双子灯台」を建設済みの場合は、期待値シミュレーターを参考に1個か2個（2〜12）を自由に選んで振ることができます。',
    },
    {
      title: '施設発動＆収入計算フェーズ（赤→青→緑・紫）',
      text: '出目合計に対応する施設カードが自動発動し、赤（通行料徴収）→青（全員生産）→緑・紫（手番者収入）の順番でコインが配分されます。',
    },
    {
      title: '都市建設フェーズで施設購入またはモニュメント完成へ',
      text: '獲得したゴールドを使って市場の施設カードを1枚建設するか、4つの港湾モニュメントのうち1つを着工します。最初に4つすべてのモニュメントを完成させたプレイヤーの即座勝利となります。',
    },
  ],
  faqs: [
    {
      q: '『サイコロ港町（ダイス・ハーバー）』は無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で何度でも遊べます。アプリのダウンロードや会員登録は一切不要です。',
    },
    {
      q: '1ダイスと2ダイスはどちらを振るのがお得ですか？',
      a: '序盤は出目1〜4の施設が多いため1ダイスが安定しますが、「帆船杉林[5]」や「海底鉄鉱脈[9]」「大樽造船工房[8]」などを揃えた中盤以降は2ダイスの期待収益が大きく上回ります。画面右上の「1ダイス vs 2ダイス 期待収益シミュレーター」でいつでも比較できます。',
    },
    {
      q: '同じ施設カードを何枚も重ねて建設できますか？',
      a: 'はい。青・緑・赤の施設カードは市場に在庫がある限り何枚でも重複して所有でき、枚数に比例して1回の出目で得られるコインが2倍・3倍に増えます（紫のギルドカードのみ1人1枚制限です）。',
    },
    {
      q: '赤の歓楽街カードと青の生産カードが同時に出た場合、どちらが先に処理されますか？',
      a: 'ルールに従い「①赤（歓楽街の徴収）→②青（全員の一次産業生産）→③緑・紫（手番者の商業・ギルド収入）」の順番で処理されます。そのため、手番プレイヤーが青や緑で稼ぐ前の所持金から赤カードの徴収が行われます。',
    },
    {
      q: 'スマートフォンでも快適に遊べますか？',
      a: 'はい。レスポンシブ設計により、スマートフォン・タブレット・PCのどの画面サイズでもダイスロールから市場カードの購入まで直感的にタップ操作できます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームや戦略ゲームをまとめて探す' },
    { href: '/mancala', label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）', description: '連続手番と横取りを読む伝統種まきボードゲーム' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/checkers', label: 'チェッカー（Checkers）', description: '駒の連続ジャンプとキング昇格を駆使する定番頭脳ボードゲーム' },
  ],
};

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${APP_URL}${seo.slug}#webpage`,
  url: `${APP_URL}${seo.slug}`,
  name: seo.h1,
  description: seo.description,
  inLanguage: 'ja-JP',
  isPartOf: { '@id': `${APP_URL}/#website` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${APP_URL}${seo.image}`,
  },
};

const pageTitle = `${seo.name}｜ダイス発動＆都市建設・拡大再生産ボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: seo.description,
  category: 'game',
  keywords: [
    'サイコロ港町',
    'ダイスハーバー',
    'Dice Harbor',
    '都市建設 ボードゲーム',
    '拡大再生産 ボードゲーム 無料',
    'ダイス ボードゲーム ブラウザ',
    '街づくり ゲーム 無料',
  ],
  alternates: {
    canonical: seo.slug,
  },
  openGraph: {
    title: pageTitle,
    description: seo.description,
    url: `${APP_URL}${seo.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${seo.image}`, width: 1200, height: 630, alt: seo.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: seo.description,
    images: [`${APP_URL}${seo.image}`],
  },
};

export default function DiceHarborPage() {
  return (
    <main className="bg-[#07111e]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{seo.h1}</h1>
      <DiceHarborGame />
      <SeoContentSection
        variant="dark"
        eyebrow="BOARD GAME GUIDE"
        title={`${seo.name}の特徴と遊び方`}
        intro={seo.description}
        features={seo.features}
        steps={seo.steps}
        faqs={seo.faqs}
        related={seo.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: seo.name },
        ]}
        jsonLd={buildGameJsonLd(seo)}
      />
    </main>
  );
}
