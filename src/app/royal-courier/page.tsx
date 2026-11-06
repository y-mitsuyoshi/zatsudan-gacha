import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import RoyalCourierGame from '@/components/board/royal-courier/RoyalCourierGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/royal-courier',
  name: '王宮の密使（Royal Courier：16枚デッキの宮廷心理推理盤ゲーム）',
  h1: '王宮の密使（Royal Courier）無料ブラウザボードゲーム｜16枚デッキ・手札1枚の宮廷心理推理＆脱落カードゲーム',
  description:
    'わずか16枚・8役職（Lv.1城門の衛兵〜Lv.8王女セレスティア）のミクロデッキと「手札1枚（手番で1枚引いて1枚出す）」で行う宮廷心理推理＆サバイバル脱落カードボードゲーム。全16枚カウンティング＆生存確率トラッカー、正体判明バッジ、記憶型AIライバル3名との4人テーブル対戦や1台2人対戦に完全対応しています。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'カードゲーム',
    '心理戦・推理ゲーム',
    'ブラフ・カウンティング',
    'テーブルゲーム',
  ],
  features: [
    {
      title: 'わずか16枚・8役職で展開する濃密な宮廷心理推理',
      text: 'デッキは「Lv.1 城門の衛兵（5枚）」から「Lv.8 王女セレスティア（1枚）」までの全16枚のみ。毎ラウンド1枚が「伏せ密書」として裏向きに封印されるため、完全確定しない絶妙な確率推理とブラフの読み合いが楽しめます。',
    },
    {
      title: '「手札1枚＋1枚ドローして1枚出す」究極に研ぎ澄まされた手番',
      text: '各プレイヤーが常に抱える手札はたった1枚。自分の手番に山札から1枚引いて2枚にし、どちらか1枚を場に出して効果を発動します。1手の選択が即座に脱落か生還かを分けるスリリングなゲーム体験です。',
    },
    {
      title: '全16枚カウンティング＆生存確率トラッカーをリアルタイム搭載',
      text: 'Lv.1〜Lv.8の各役職のデッキ総数、これまでに場に出た公開枚数、未公開の残り枚数を常時一覧表示。さらに「Lv.2 占星術師」で覗き見た相手や「Lv.6 枢機卿」で渡した相手には「👁️ 正体判明バッジ」が自動付与されます。',
    },
    {
      title: '「Lv.7 女公爵」の強制プレイ規則が生む高度なブラフ心理戦',
      text: '手札に「Lv.5 宮廷魔導師」または「Lv.6 枢機卿」と一緒に「Lv.7 女公爵」がある場合、必ず女公爵を場に出さなければならない宮廷儀礼ルールを搭載。あえて早く女公爵を出して高ランク保持を装うフェイントも可能です。',
    },
    {
      title: '記憶＆推理ロジックを持つ3名の宮廷AIライバルと対戦',
      text: '覗き見た正体や捨て札を記憶して精密に狙撃する「記憶型スパイ・クロード」、決闘を挑む「強気騎士・エレノア」、結界とブラフを操る「ブラフ公爵・マルクス」の3名と2〜4人テーブルで対局できます。',
    },
    {
      title: '1台で2人対戦（秘密保護シールド付き）＆チェンバロBGM搭載',
      text: 'スマートフォンやPC1台を交互に使って遊べる「1台で2人対戦（パス＆プレイ）」には手札覗き見防止シールドを完備。Web Audio APIによるバロック・チェンバロ風の宮廷BGMと剣戟・結界効果音もワンタップで切り替えられます。',
    },
  ],
  steps: [
    {
      title: '対戦モード（CPU 2〜4人 / 1台2人）と勝利封蝋数を選択',
      text: 'まずは「CPU対戦 4人テーブル」または「1台で2人対戦」を選びます。全16枚のデッキがシャッフルされ、1枚が「伏せ密書」として裏向きで除外された後、全員に手札が1枚ずつ配られます。',
    },
    {
      title: '手番で山札から1枚引き、2枚のうち1枚を場に出す',
      text: '自分の手番が来たら自動で1枚ドローし、手札の2枚から場に出す1枚と指名相手を選びます。「Lv.1 城門の衛兵」なら相手の役職（Lv.2〜8）を宣言して的中すれば即時脱落させられます。',
    },
    {
      title: 'カウンティングと正体判明バッジを駆使して生き残る',
      text: '「Lv.2 占星術師」で覗き見た正体や、「全16枚カウンティング＆生存確率トラッカー」の未公開枚数を手がかりに、相手の手札を読み切りましょう。「Lv.4 結界の修道女」を使えば次の手番まで指名を完全無効化できます。',
    },
    {
      title: '最後の1人になるか山札0枚で手札比較し「封蝋トークン」獲得',
      text: '他プレイヤーを全員脱落させるか、山札が尽きた時点で生き残っているプレイヤー同士が手札のランク（Lv）を比較し、最高ランクの密使が「王宮の封蝋トークン（⚜）」を獲得。規定数（標準3個）を先取したプレイヤーが優勝です！',
    },
  ],
  faqs: [
    {
      q: '『王宮の密使（Royal Courier）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザから登録不要・完全無料で何度でもプレイできます。',
    },
    {
      q: '「Lv.1 城門の衛兵」で相手の「Lv.1 城門の衛兵」を宣言できますか？',
      a: 'いいえ。ルール上、城門の衛兵の効果で宣言できる役職は「Lv.2 占星術師」から「Lv.8 王女セレスティア」までの7種類です。Lv.1は宣言できません。',
    },
    {
      q: '指名したい相手全員が「Lv.4 結界の修道女」の守護結界状態だった場合はどうなりますか？',
      a: '他プレイヤー全員が守護結界で守られている場合でもカード自体は場に出すことができます。その場合、「Lv.1 衛兵」「Lv.2 占星術師」「Lv.3 決闘騎士」「Lv.6 枢機卿」は対象不在で不発となり、「Lv.5 宮廷魔導師」は自分自身を対象にして手札を入れ替えることになります。',
    },
    {
      q: '「Lv.8 王女セレスティア」はいつ脱落になりますか？',
      a: '自分の手番に王女セレスティアを場に出してしまった場合、または自分や他プレイヤーの「Lv.5 宮廷魔導師」の効果によって手札から捨てさせられた瞬間に、ただちに脱落となります。',
    },
    {
      q: '山札が0枚のときに「Lv.5 宮廷魔導師」で手札を捨てさせた場合はどうなりますか？',
      a: '山札の最後の1枚が引かれた手番で「Lv.5 宮廷魔導師」が使われ、相手が脱落しなかった場合は、ラウンド開始時に脇へ伏せておいた「伏せ密書（1枚）」を新しい手札として引きます。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ブラウザゲーム一覧',
      description: '定番ボードゲームや思考型テーブルゲームをまとめて探す',
    },
    {
      href: '/stellar-atelier',
      label: '星屑のアトリエ（Stellar Atelier）',
      description: '5属性の星片を集めて永続割引エンジンを育てる拡大再生産ボードゲーム',
    },
    {
      href: '/mancala',
      label: 'マンカラ（カラハ・種まき頭脳ボードゲーム）',
      description: '連続手番と横取りを読む種まきリソース管理ボードゲーム',
    },
    {
      href: '/reversi',
      label: 'リバーシ（Reversi 3D / 2D）',
      description: '3D/2D切替＆AI対戦対応の定番8×8挟み反転ボードゲーム',
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

const pageTitle = `${game.name}｜AI対戦＆2人対戦対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '王宮の密使',
    'Royal Courier',
    '心理推理 ボードゲーム',
    '16枚 カードゲーム 無料',
    'ブラウザ ボードゲーム',
    'カウンティング カードゲーム',
    'AI対戦 ボードゲーム',
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

export default function RoyalCourierPage() {
  return (
    <main className="bg-[#090712]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <RoyalCourierGame />
      <SeoContentSection
        variant="dark"
        eyebrow="ROYAL COURT DEDUCTION CARD GAME GUIDE"
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
