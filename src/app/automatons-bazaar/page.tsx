import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import AutomatonsBazaarGame from '@/components/board/automatons-bazaar/AutomatonsBazaarGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: GameSeoData = {
  slug: '/automatons-bazaar',
  name: 'からくりバザール：歯車都市の競売人（Automaton’s Bazaar）',
  h1: 'からくりバザール：歯車都市の競売人｜同時入札オークション＆セット収集無料ブラウザボードゲーム',
  description:
    '蒸気と真鍮の歯車都市を舞台に、4人の商人ギルドが1〜10の使い切り金貨カードで全10ラウンドの同時公開オークションに挑む無料ブラウザボードゲーム！同額入札が相殺される「バッティング無効ルール」、単独最低額が引き取る「暴走スクラップ（逆競り）」、4大ギルド紋章のセットボーナス、全プレイヤー残り手札カウンティング表＆推奨入札アナライザーを搭載しています。',
  image: '/ogp.png',
  genre: ['ボードゲーム', '同時入札オークション', 'セットコレクション', '心理戦・頭脳ゲーム'],
  features: [
    {
      title: '1〜10の使い切り金貨カードによる全10ラウンド同時公開オークション',
      text: '4人の商人全員がまったく同じ「1〜10ソヴリン金貨」の手札10枚からスタート。1ラウンドにつき1枚を伏せて同時公開し、一度使ったカードはゲーム終了まで復活しません。',
    },
    {
      title: '同額入札が相殺されるスリリングな「バッティング無効ルール」',
      text: '最高額の金貨を出しても、他の商人と数字が重なると「バッティング無効」となり両者の入札がキャンセル！単独で最も高い額を出した次点の商人が漁夫の利で名品を落札します。',
    },
    {
      title: '単独最低額が負債を背負う「暴走スクラップ（逆競り）」ラウンド',
      text: 'マイナス点となる暴走スクラップが出品されたラウンドではルールが逆転。同額相殺を除き「単独で最も低い金貨」を出した商人がスクラップを引き取るため、1金貨の切り時が問われます。',
    },
    {
      title: '4大ギルド紋章のセットボーナス＆大工房コンプリート賞',
      text: '「天文時計」「蒸気機関」「自動人形」「飛行羅針盤」の4紋章を収集。同じ紋章を2個（+3pt）・3個（+8pt）・4個（+15pt）集める累進セットボーナスと、4種すべてを揃える大工房ボーナス（+10pt）で一発逆転を狙えます。',
    },
    {
      title: '完全公開の「全プレイヤー残り手札カウンティング表」',
      text: '誰がどの数字（1〜10）をすでに使い、どの高額カードを温存しているかをリアルタイムのマトリクス表で一覧表示。自分だけが持つ「バッティング確率0%の単独確定カード」も自動ハイライトします。',
    },
    {
      title: 'AI3名の行動傾向から算出する「バッティング確率＆推奨入札アナライザー」',
      text: '高点狙いのクロノス卿、セット重視のヴェスパー嬢、裏かき派のガジェット博士の手札と思考パターンから、各カードを出した際の勝率と被りリスクをリアルタイムに解析します。',
    },
  ],
  steps: [
    {
      title: '出品ロットの点数・ギルド紋章・競売ルールを確認',
      text: 'プラス点の名匠からくり品（単独最高額が落札）か、マイナス点の暴走スクラップ（単独最低額が引取）か、そして自分のセットボーナスが伸びる紋章かを確認します。',
    },
    {
      title: '残り手札カウンティング表でライバルの温存カードを読む',
      text: '右側のカウンティング表を見て、AI商人たちが「9」や「10」をまだ持っているか、自分が単独で保持している数字はどれかをチェックします。',
    },
    {
      title: '1〜10の手札から1枚を選んで一斉公開入札',
      text: 'このラウンドで切る金貨カードを1枚選び「一斉公開入札する」をタップ。4人全員のカードが同時にオープンされ、バッティング判定と落札者が決まります。',
    },
    {
      title: '全10ラウンド終了時の合計スコアで歯車都市の筆頭商人へ',
      text: '全10ラウンド終了後、基本評価値・スクラップ減点・同紋章セットボーナス・4種コンプリート賞を合算し、最高得点の商人が優勝となります。',
    },
  ],
  faqs: [
    {
      q: '「からくりバザール：歯車都市の競売人」は無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで完全無料で何度でも遊べます。アプリのインストールや会員登録は一切不要です。',
    },
    {
      q: '全員がバッティング（同額入札）になった場合はどうなりますか？',
      a: '2人が同じ数字を出し、残りの2人も同じ数字を出して全員が相殺された場合は落札者なしとなり、出品ロットは次のラウンドへ「キャリーオーバー（持ち越し）」されて次回の落札者がまとめて総取りします。',
    },
    {
      q: '暴走スクラップ（マイナス点）のラウンドはどう立ち回ればいいですか？',
      a: '単独で一番小さい数字を出した人がマイナス点を引き取ってしまいます。1や2は危険ですが、他のAIとわざと同じ低額を出してバッティング相殺を狙うか、中盤の4〜6金貨で安全に回避するのがセオリーです。',
    },
    {
      q: 'セットボーナスはどのように計算されますか？',
      a: '同じギルド紋章のからくり品を2個集めると+3pt、3個で+8pt、4個で+15ptが加算されます。さらに4種類の紋章をそれぞれ1個以上集めると「4種コンプリート大賞（+10pt）」が追加されます。',
    },
    {
      q: 'スマートフォンでも快適に遊べますか？',
      a: 'はい。スマートフォン・タブレット・PCのすべてに対応しており、金貨カードのタップ選択から手札カウンティング表の確認まで片手で快適にプレイできます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番ボードゲームや思考型ゲームをまとめて探す' },
    { href: '/mancala', label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）', description: 'カラハ＆ベーシックの2ルール対応の種まき頭脳戦' },
    { href: '/reversi', label: 'リバーシ（Reversi 3D / 2D）', description: '3D/2D切替対応の定番8×8挟み反転ボードゲーム' },
    { href: '/gomoku', label: '五目並べ（15×15 連珠・五目戦略盤）', description: '形勢判断＆リーチ検知付きの本格15×15五目並べ' },
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

const pageTitle = `${seo.name}｜バッティング心理戦＆セット収集の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: seo.description,
  category: 'game',
  keywords: [
    'からくりバザール',
    'Automaton Bazaar',
    '同時入札 ボードゲーム',
    '競り ボードゲーム 無料',
    'バッティング 心理戦 ゲーム',
    'セットコレクション ボードゲーム',
    'ブラウザ ボードゲーム AI対戦',
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

export default function AutomatonsBazaarPage() {
  return (
    <main className="bg-[#120d08]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{seo.h1}</h1>
      <AutomatonsBazaarGame />
      <SeoContentSection
        variant="dark"
        eyebrow="AUCTION BOARD GAME GUIDE"
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
