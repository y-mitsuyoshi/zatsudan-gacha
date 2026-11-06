import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import SkyBotanistGame from '@/components/board/sky-botanist/SkyBotanistGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/sky-botanist',
  name: '天空の植物園（Sky Botanist：3層ビオトープ＆連鎖エンジン構築ボードゲーム）',
  h1: '天空の植物園（Sky Botanist）無料ブラウザボードゲーム｜3層ビオトープ＆生態系エンジン構築盤ゲーム',
  description:
    '森林・水辺・天空の3層ビオトープに幻想植物を植え、右から左へと連鎖発動する能力コンボで生態系エンジンを育てる無料ブラウザボードゲーム。4種の霊水リソース、生命の種子、腐葉堆肥、季節目標、ソロ＆2〜4人AI対戦を搭載しています。',
  image: '/ogp.png',
  genre: [
    'ボードゲーム',
    'エンジンビルドゲーム',
    'カードコンボゲーム',
    'リソース管理ゲーム',
    'テーブルゲーム',
  ],
  features: [
    {
      title: '森林・水辺・天空の3層ビオトープと右→左の連鎖エンジン',
      text: '個人ボードの3つのビオトープ列（森林・水辺・天空）に幻想植物カードを配置し、各列を稼働させると配置済みの植物カードが右から左へ順番に「[連鎖時]」能力を発動。植えるほど1手の出力が雪だるま式に増幅します。',
    },
    {
      title: '4種の霊水リソース（太陽雫・雨露・星砂・翠葉）と2:1代替ルール',
      text: '霊水泉から太陽雫・雨露・星砂・翠葉の4属性リソースを採取して植物を育成。特定の霊水が不足しても任意の霊水2個を1個分として代替支払いできるため、手詰まりになりにくい快適設計です。',
    },
    {
      title: '生命の種子・腐葉堆肥・素点・季節目標の多彩な得点ルート',
      text: '植物自体の素点だけでなく、カード上に蓄える「生命の種子（各1点＆植栽コスト）」やカード下に差し込む「腐葉堆肥（各1点）」、季節ごとの生態系目標ボーナスなど多様な戦略でハイスコアを狙えます。',
    },
    {
      title: '全24種の幻想植物カード（植栽時・連鎖時・終了時能力）',
      text: '「星詠みの睡蓮」「天空の枝垂れ桜」「結晶シダ」など、カスタムSVGアイコン付きの幻想植物24種を収録。植えた瞬間に発動する能力、列稼働で毎回発動する連鎖能力、最終決算で輝く大器晩成カードを組み合わせられます。',
    },
    {
      title: '3タイプの植物学者AI対戦（2〜4人）・1台2人対戦・ソロモード対応',
      text: '連鎖重視の「セレス」、高得点巨木を狙う「オーベロン」、季節目標を優先する「リリア」との2〜4人CPU対戦に加え、1台での2人パス＆プレイ、1人でじっくり高得点を目指すソロモードを搭載しています。',
    },
    {
      title: '天空庭園アンビエントBGM・効果音・「1手戻す」・「AI推奨手ヒント」完備',
      text: 'Web Audio APIによる心地よい天空庭園アンビエントBGMと効果音を搭載。操作ミスを戻せる「1手戻す」や最善手を教えてくれる「AI推奨手ヒント」も完備しています。',
    },
  ],
  steps: [
    {
      title: 'ゲームモードと参加人数（ソロ / 2〜4人）を選択',
      text: 'CPU対戦（2〜4人）、1台2人対戦、またはソロ・スコアアタックを選択して4季節（計26手番）の植物園づくりを開始します。',
    },
    {
      title: '手番では「植物を植える」または「3列のいずれかを稼働」を選択',
      text: '手札から植物カードをビオトープへ植えるか、森林（霊水獲得）・水辺（種子生成）・天空（新種カード獲得）のどれか1列を稼働させます。',
    },
    {
      title: '列を稼働させて右から左へ「[連鎖時]」能力をコンボ発動',
      text: '稼働した列の基本報酬を受け取ったあと、その列に植えられている植物の「[連鎖時]」能力が右から左へ次々と発動し、追加の霊水・種子・堆肥・カードを生み出します。',
    },
    {
      title: '4季節終了後に5項目の総合スコアで勝者を決定',
      text: '春・夏・秋・冬の4季節が終わると最終決算へ。植物素点・生命の種子・腐葉堆肥・終了時能力・季節目標ボーナスの合計スコアで勝者を競います。',
    },
  ],
  faqs: [
    {
      q: '『天空の植物園（Sky Botanist）』は無料で遊べますか？',
      a: 'はい。PC・スマートフォン・タブレットのブラウザから完全無料で何度でも遊べます。会員登録やアプリのインストールは不要です。',
    },
    {
      q: '2列目以降に植物を植えるときの「種子コスト」とは何ですか？',
      a: '各ビオトープの1列目（左端）は種子コスト0個で植えられますが、2〜3列目は1個、4〜5列目は2個の「生命の種子」を盤面の植物上から支払う必要があります。水辺ビオトープを稼働して種子を増やしておきましょう。',
    },
    {
      q: '必要な種類の霊水がない場合は植物を植えられませんか？',
      a: '任意の他の霊水2個を支払うことで、不足している霊水1個分として自動的に代替支払い（2:1変換）が可能です。',
    },
    {
      q: '連鎖能力はどの順番で発動しますか？',
      a: '稼働させたビオトープ列の基本効果（霊水・種子・カード獲得）を解決したあと、その列の「一番右に置かれている植物」から「一番左の植物」へ向かって順番に[連鎖時]能力が自動発動します。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ブラウザゲーム一覧',
      description: '拡大再生産やタイル配置などのオリジナルボードゲームを探す',
    },
    {
      href: '/stellar-atelier',
      label: '星屑のアトリエ（Stellar Atelier）',
      description: '5属性の星片を集めて工房レシピを錬成する拡大再生産ボードゲーム',
    },
    {
      href: '/stained-glass-mosaic',
      label: '硝子工房のモザイク師（Stained Glass Mosaic）',
      description: '色硝子をドラフトして5×5ステンドグラス窓を完成させるパズル盤ゲーム',
    },
    {
      href: '/dice-harbor',
      label: 'ダイス・ハーバー（Dice Harbor）',
      description: 'ダイス目で施設が一斉稼働する港町拡大ボードゲーム',
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

const pageTitle = `${game.name}｜AI対戦＆ソロ対応の無料ブラウザボードゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    '天空の植物園',
    'Sky Botanist',
    'エンジンビルド ボードゲーム 無料',
    '拡大再生産 ボードゲーム ブラウザ',
    '生態系 カードコンボ ゲーム',
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

export default function SkyBotanistPage() {
  return (
    <main className="bg-[#050d0a]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <SkyBotanistGame />
      <SeoContentSection
        variant="dark"
        eyebrow="ECOSYSTEM ENGINE-BUILDING BOARD GAME GUIDE"
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
