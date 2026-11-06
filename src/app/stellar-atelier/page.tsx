import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import StellarAtelierGame from '@/components/board/stellar-atelier/StellarAtelierGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/stellar-atelier',
  name: '星屑のアトリエ（Stellar Atelier：星片収集＆錬成エンジンビルド盤ゲーム）',
  h1: '星屑のアトリエ（Stellar Atelier）無料ブラウザボードゲーム｜星片収集＆永続割引エンジンビルド戦略ゲーム',
  description:
    '5属性の星片（紅炎・蒼氷・翠風・琥珀・紫電）と虹プリズム結晶を集めて工房レシピを錬成し、永続割引ボーナス（共鳴エンジン）を育てて名声星15★を目指す拡大再生産・エンジンビルド型無料ブラウザボードゲーム。星座パトロンタイルの自動来訪、必要コスト計算ナビ、3タイプのAI対戦（2〜4人）＆1台2人対戦を搭載しています。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'エンジンビルド',
    '拡大再生産ゲーム',
    'リソース管理',
    'テーブルゲーム',
  ],
  features: [
    {
      title: '錬成するほど次が安くなる「永続共鳴エンジンビルド」の快感',
      text: '工房レシピカードを1枚錬成するたびに、そのカードの属性（紅炎・蒼氷・翠風・琥珀・紫電）の永続割引ボーナスを獲得。序盤は初級錬成式で基盤を築き、終盤には高コストの高等星辰機関をわずかな星片だけで次々と錬成できるようになります。',
    },
    {
      title: '1手番1アクションの研ぎ澄まされた3択ジレンマ',
      text: '自分の手番に行えるのは「①星片の採取（異色3個または同色2個）」「②工房レシピの錬成」「③設計図の予約＋虹プリズム結晶（ワイルド）獲得」の3つのうち1つだけ。シンプルながら奥深いリソース管理が楽しめます。',
    },
    {
      title: '星座パトロンタイルの来訪（+3★）を巡るボーナス競争',
      text: '各レシピが持つ永続共鳴ボーナスの組み合わせが星座パトロンの条件（例：3色×3枚や2色×4枚）を満たすと、手番終了時に自動でパトロンがアトリエを訪れ、一気に名声星+3★をもたらします。',
    },
    {
      title: '錬成エンジン割引＆必要コスト計算ナビをリアルタイム表示',
      text: '現在の永続割引を差し引いた「実質必要コスト」「錬成可能！バッジ」「あと1手で錬成圏内バッジ」をすべてのカードにリアルタイム表示。初心者でも計算ミスなく快適にプレイできます。',
    },
    {
      title: '個性豊かな3タイプAI（堅実型・速攻型・パトロン重視型）＆2人対戦',
      text: '2〜4人でのCPU対戦では、基礎エンジンを固める「堅実型」、高名声カードへ直行する「速攻型」、星座タイルを狙う「パトロン重視型」のAIと対局可能。1台の端末での2人パス＆プレイにも対応しています。',
    },
    {
      title: '「1手戻す」と「AI推奨手ナビ」で戦略研究をサポート',
      text: 'どの星片を集めるか、どのレシピを予約すべきか迷った時は「AI推奨手ナビ」が根拠付きで最善手を提案。うっかり操作ミスをした際も「1手戻す」で直前の手番からやり直せます。',
    },
  ],
  steps: [
    {
      title: '対戦モードと参加人数（2〜4人）を選択',
      text: '「CPU対戦（2〜4人）」または「1台で2人対戦（パス＆プレイ）」を選び、対局を開始します。',
    },
    {
      title: '星片を採取して初級レシピ（Tier I）を錬成',
      text: 'まずはサプライから異なる色の星片を3個（または在庫4個以上の同色2個）採取し、永続割引ボーナスを持つTier Iレシピを錬成してエンジンの土台を作ります。',
    },
    {
      title: '設計図の予約＆虹プリズム結晶を活用',
      text: '狙っている高得点カードや相手に取られたくないカードは「予約」して確保しましょう。同時にあらゆる色の代わりになる「虹プリズム結晶」を1個獲得できます。',
    },
    {
      title: '名声星15★到達で最終ラウンド突入・勝者決定',
      text: '永続ボーナスで星座パトロン（+3★）を招きつつ、Tier II・Tier IIIのレシピを錬成。誰かが15★以上に達したらそのラウンドを最後まで行い、最も名声星が多い錬金術師の勝利となります。',
    },
  ],
  faqs: [
    {
      q: '『星屑のアトリエ（Stellar Atelier）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザで開くだけで完全無料で何度でも遊べます。アプリのインストールや会員登録は一切不要です。',
    },
    {
      q: '永続共鳴ボーナス（割引）を使うとカードはなくなりませんか？',
      a: 'なくなりません。一度錬成したレシピカードの属性ボーナスはゲーム終了までずっと自分のアトリエに残り、以降のすべてのレシピ錬成コストを自動的に軽減し続けます。',
    },
    {
      q: '手持ちの星片が10個を超えた場合はどうなりますか？',
      a: '手元に所持できる星片（虹プリズム結晶を含む）は合計10個までです。採取後に10個を超える場合は、画面の案内に従って余分な星片をサプライへ返却して10個ぴったりに調整します。',
    },
    {
      q: '星座パトロンタイルはどうすれば獲得できますか？',
      a: '手持ちの星片トークンではなく、これまでに錬成したレシピカードの「永続属性ボーナスの枚数」がパトロンタイルの指定条件を満たしたとき、手番終了時にコスト消費なしで自動的に獲得（+3★）されます。',
    },
    {
      q: '15★に到達した時点で即座にゲーム終了になりますか？',
      a: 'いいえ。誰かが15★以上に到達した時点で「最終ラウンド」に入り、全員の手番数が同じになるよう最後のプレイヤーまで手番を行ってから最終得点を比較します。同点の場合は、錬成したレシピ枚数がより少ないプレイヤーが勝利します。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ブラウザゲーム一覧',
      description: '定番ボードゲームや思考型テーブルゲームをまとめて探す',
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
    {
      href: '/qubic-four',
      label: '立体四目並べ 3D（Qubic 4×4×4）',
      description: 'Three.jsで遊べる4×4×4の3D空間重力四目並べ',
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
    '星屑のアトリエ',
    'Stellar Atelier',
    'エンジンビルド ボードゲーム',
    '拡大再生産 ボードゲーム 無料',
    'ブラウザ ボードゲーム',
    'リソース管理 ゲーム',
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

export default function StellarAtelierPage() {
  return (
    <main className="bg-[#070913]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <StellarAtelierGame />
      <SeoContentSection
        variant="dark"
        eyebrow="ENGINE-BUILDING BOARD GAME GUIDE"
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
