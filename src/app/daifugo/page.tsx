import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import DaifugoGame from '@/components/cards/daifugo/DaifugoGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/daifugo',
  name: '大富豪（大貧民・AI 4人対戦）',
  h1: '大富豪（大貧民）｜革命・8切り・階段・スペ3返し・都落ち対応の無料AI 4人対戦トランプ',
  description:
    '国民的トランプゲーム「大富豪（大貧民）」をブラウザで今すぐ無料プレイ。個性豊かなAI 3人（堅実温存・積極革命・速攻あがり）との4人対戦に対応し、革命・8切り・同スート階段・スペ3返し・都落ちの5大ローカルルールを自由にON/OFF設定可能。第2ラウンド以降の階級カード交換や出せるカード自動ハイライトも備えています。',
  image: '/ogp.png',
  genre: ['トランプ', 'カードゲーム', '大富豪', 'テーブルゲーム'],
  features: [
    {
      title: '個性豊かな3タイプのAIとすぐに遊べる4人対戦',
      text: '「堅実温存タイプ」「積極革命タイプ」「速攻あがりタイプ」の3名のAIと54枚（ジョーカー2枚入り）で本格対戦できます。',
    },
    {
      title: '5大ローカルルール（革命・8切り・階段・スペ3返し・都落ち）切替',
      text: '地域や仲間内で人気のローカルルールを画面右側のスイッチでいつでもON/OFFカスタマイズできます。',
    },
    {
      title: '階級システム＆第2ラウンド以降のカード交換に対応',
      text: 'あがり順に応じて「大富豪・富豪・貧民・大貧民」の階級が決定。次ラウンド開始時には上位と下位でのカード献上・交換イベントが発生します。',
    },
    {
      title: '現在場に出せるカードを緑色リングで自動ハイライト',
      text: '手番になると、現在の場のカード（単騎・ペア・3枚組・階段）に対して合法的に出せる手札が自動でハイライト表示されるため初心者でも迷いません。',
    },
    {
      title: 'ジョーカーのワイルドカード＆スペ3返し完全実装',
      text: 'ジョーカーは単体最強カードとしてだけでなく、ペアや階段の代用（ワイルドカード）としても使用可能。単体ジョーカーを♠3で討ち取るスペ3返しにも対応しています。',
    },
    {
      title: 'スマホでもタップしやすいカード選択＆進行ログ',
      text: '誰がどの役を出したか・8切りや革命がいつ起きたかが一目でわかる進行ログを搭載しています。',
    },
  ],
  steps: [
    {
      title: 'ローカルルールを確認してゲーム開始',
      text: '54枚のカードが4人に配られます。右パネルで革命・8切り・階段・スペ3返し・都落ちのON/OFFを好みに合わせて設定できます。',
    },
    {
      title: '親から順番に、場のカードより強い役を出す',
      text: '通常時は「3」が最弱、「2」と「JOKER」が最強です。場に出ている枚数・役と同じ形式で、より強いランクのカードを出していきます。',
    },
    {
      title: '8切り・革命・階段を駆使して手札を0枚にする',
      text: '8を出して場を流したり、4枚出しで強さを逆転させる「革命」を起こしたりして、誰よりも早く手札をすべて出し切れば「大富豪」となります。',
    },
  ],
  faqs: [
    {
      q: '大富豪（大貧民）は無料で遊べますか？',
      a: 'はい。ブラウザを開くだけで登録不要・完全無料で何ラウンドでも遊べます。',
    },
    {
      q: 'カードの強さの順番はどうなっていますか？',
      a: '通常時は弱い方から「3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < JOKER」の順です。4枚同時出しで「革命」が起きると「2」が最弱・「3」が最強に逆転します（JOKERは革命中も最強です）。',
    },
    {
      q: 'スペ3返しとはどんなルールですか？',
      a: '場に単体（1枚）のジョーカーが出されたとき、スペードの3（♠3）を1枚出すことでジョーカーに勝利し、そのまま場を流して自分が親になれる爽快な逆転ルールです。',
    },
    {
      q: '都落ちとは何ですか？',
      a: '前ラウンドで1位（大富豪）だったプレイヤーよりも先に、他の誰かが1位であがってしまった場合、前ラウンドの大富豪が即座に最下位（大貧民）へ転落するルールです。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/texas-holdem', label: 'ロイヤル・ナイト・ポーカー（テキサスホールデム）', description: 'アニメキャラ6人と対戦できるカットイン演出付き本格ポーカー' },
    { href: '/blackjack', label: 'ブラックジャック（21）', description: 'ベーシックストラテジー＆確率ナビ付きのカジノカードゲーム' },
    { href: '/klondike', label: 'ソリティア（クロンダイク）', description: '1枚・3枚めくり対応の定番1人用トランプ' },
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

const pageTitle = `${game.name}｜革命・8切り・階段対応の無料トランプゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '大富豪 無料',
    '大貧民 無料',
    '大富豪 ブラウザ',
    'トランプ 大富豪 AI',
    '革命 8切り スペ3返し',
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

export default function DaifugoPage() {
  return (
    <main className="bg-slate-950">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <DaifugoGame />
      <SeoContentSection
        variant="dark"
        eyebrow="CLASSIC PARTY CARD GAME"
        title={`${game.name}の特徴とローカルルール解説`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ブラウザゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </main>
  );
}
