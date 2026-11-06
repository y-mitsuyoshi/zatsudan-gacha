import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import StainedGlassMosaicGame from '@/components/board/stained-glass-mosaic/StainedGlassMosaicGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/stained-glass-mosaic',
  name: '硝子工房のモザイク師（Stained Glass Mosaic：硝子窯ドラフト＆大聖堂モザイク窓パズル）',
  h1: '硝子工房のモザイク師（Stained Glass Mosaic）無料ブラウザボードゲーム｜ステンドグラス・ドラフト＆幾何学モザイク盤ゲーム',
  description:
    '5色の色硝子ピース（紅ルビー・蒼サファイア・翠エメラルド・琥珀アンバー・紫アメジスト）を硝子窯（キルン）や中庭ストックからドラフトし、準備作業台（1〜5段）を経て5×5の大聖堂ステンドグラス窓へ嵌め込むタイル配置型無料ブラウザボードゲーム。縦横の隣接連鎖ボーナス、破損ガラス枠の減点駆け引き、3タイプのAI対戦（2〜4人）＆1台2人対戦を搭載しています。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'タイル配置ゲーム',
    'ドラフトゲーム',
    'パズルボードゲーム',
    'テーブルゲーム',
  ],
  features: [
    {
      title: '硝子窯（キルン）と中庭ストックを巡る奥深い色硝子ドラフト',
      text: '選んだ硝子窯から同色の色硝子ピースをすべて獲得すると、残りのピースは中央の「中庭ストック」へ集まります。自分が欲しい枚数を確保しつつ、相手に大量の余剰ピースを押し付ける熱い駆け引きが楽しめます。',
    },
    {
      title: '準備作業台（1〜5段）と5×5大聖堂ステンドグラス窓の連鎖設計',
      text: '容量1〜5枚の準備作業台を満杯にすると、ラウンド終了時の焼き入れフェーズで大聖堂ステンドグラス窓へピースが嵌め込まれます。縦・横に隣接するピースを繋げるほど1手あたりの獲得スコアが跳ね上がります。',
    },
    {
      title: '破損ガラス枠（減点ライン）と親方マーカーの先手権ジレンマ',
      text: '作業台に収まりきらない余剰ピースは破損ガラス枠（-1〜-3点）へ落ちます。中庭ストックから最初に採取すると「親方マーカー（-1点）」を受け取る代わりに、次ラウンドの先手権を確実に握ることができます。',
    },
    {
      title: '配置時の即時獲得点＆減点プレビューをリアルタイム表示',
      text: '採取する色硝子を選んで準備作業台にカーソルを合わせるだけで、このラウンドで完成した際の縦横連鎖得点や破損減点、実質収支をリアルタイムに試算表示。初心者でも直感的に最善手を比較できます。',
    },
    {
      title: '個性豊かな3タイプAI（連鎖重視・妨害カット・完成ボーナス狙い）＆2人対戦',
      text: '2〜4人でのCPU対戦では、縦横連鎖を伸ばす「連鎖重視AI」、相手の必要枚数を先回りする「妨害カットAI」、縦列7点・同色10点を狙う「完成ボーナス狙いAI」と対局可能。1台での2人パス＆プレイにも対応しています。',
    },
    {
      title: '大聖堂ハープBGM・硝子効果音・「1手戻す」・「AI推奨手ヒント」完備',
      text: 'Web Audio APIによる透明感あふれる硝子クリック音や大聖堂ハープ＆チェレスタBGMを搭載。迷った時の「AI推奨手ヒント」や操作ミスをやり直せる「1手戻す」機能で快適に遊べます。',
    },
  ],
  steps: [
    {
      title: '対戦モードと参加人数（2〜4人）を選択',
      text: '「CPU対戦（2〜4人：硝子窯5/7/9基）」または「1台で2人対戦（パス＆プレイ）」を選び、対局を開始します。',
    },
    {
      title: '第1フェーズ：硝子窯または中庭ストックから色硝子を採取',
      text: '硝子窯1基または中庭ストックから1色を選び、その色のピースをすべて獲得して自分の準備作業台（1〜5段目）の1つへ配置します。',
    },
    {
      title: '第2フェーズ：焼き入れ＆大聖堂ステンドグラス窓への嵌め込み',
      text: 'すべての硝子窯と中庭ストックが空になると自動で焼き入れフェーズへ進み、満杯になった作業台の右端ピースが大聖堂窓へ嵌め込まれて縦横の連鎖得点を獲得します。',
    },
    {
      title: '横1列完成でゲーム終了・3大完成ボーナスを加算して勝者決定',
      text: '誰かが大聖堂ステンドグラス窓の横1列（5マス）を完成させたラウンドで対局終了。横1列（+2点）・縦1列（+7点）・同色5枚コンプリート（+10点）のボーナスを加えた最終スコアで勝者を競います。',
    },
  ],
  faqs: [
    {
      q: '『硝子工房のモザイク師（Stained Glass Mosaic）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザから完全無料で何度でも遊べます。アプリのダウンロードや会員登録は一切不要です。',
    },
    {
      q: '準備作業台に色硝子を置けないのはどんな場合ですか？',
      a: 'すでに別の色が置かれている段や、その段に対応する大聖堂ステンドグラス窓の横列に同じ色がすでに嵌め込まれている場合は配置できません。どの段にも置けない場合は「破損ガラス枠」へ直接破棄します。',
    },
    {
      q: 'ラウンド終了時に満杯にならなかった準備作業台のピースはどうなりますか？',
      a: '満杯にならなかった段の色硝子ピースは撤去されず、そのまま次のラウンドへ持ち越されます。次ラウンドで同じ色を買い足して完成させることができます。',
    },
    {
      q: 'ステンドグラス嵌め込み時の連鎖得点はどのように計算されますか？',
      a: '新しく嵌め込んだピースに上下左右で隣接しているピースがない場合は「1点」です。横に繋がっている場合はその連続枚数、縦に繋がっている場合はその連続枚数を獲得し、縦と横の両方に繋がっている場合は「横の連続枚数＋縦の連続枚数」の両方を合算して獲得できます。',
    },
    {
      q: '親方マーカーにはどんなメリットとデメリットがありますか？',
      a: '各ラウンドで最初に中庭ストックから色硝子を採取したプレイヤーが自動的に受け取ります。破損ガラス枠の1マス目を埋めるためラウンド終了時に「-1点」となりますが、次のラウンドで誰よりも早く最初の1手を選べる「先手権」を獲得できます。',
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
      description: '5属性の星片を集めて工房レシピを錬成する拡大再生産ボードゲーム',
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
    '硝子工房のモザイク師',
    'Stained Glass Mosaic',
    'タイル配置 ボードゲーム 無料',
    'ステンドグラス パズル ゲーム',
    'ドラフト ボードゲーム ブラウザ',
    'モザイク ボードゲーム',
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

export default function StainedGlassMosaicPage() {
  return (
    <main className="bg-[#070914]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <StainedGlassMosaicGame />
      <SeoContentSection
        variant="dark"
        eyebrow="TILE-DRAFTING MOSAIC BOARD GAME GUIDE"
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
