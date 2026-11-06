import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import FreecellGame from '@/components/cards/freecell/FreecellGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/freecell',
  name: 'フリーセル（FreeCell）',
  h1: 'フリーセル（FreeCell）｜全カード表向きから解く完全情報トランプパズル（無料ブラウザ版）',
  description:
    '最初から52枚すべてのカードが表向きで配られる論理思考型ソリティア「フリーセル（FreeCell）」をブラウザで無料プレイ。4つのフリーセルと空き列を活用した正確なスーパー・ムーブ計算、ワンタップ自動移動、安全カードの自動組札送り、無制限アンドゥ、ゲーム番号指定（#1〜#99999）に対応しています。',
  image: '/ogp.png',
  genre: ['トランプ', 'パズル', 'ソリティア', '思考ゲーム'],
  features: [
    {
      title: '運要素ほぼゼロ！52枚すべて表向きの完全情報パズル',
      text: '通常のソリティアと異なり裏向きカードがないため、先読みとフリーセル（一時保管場所）のやりくりだけで99.99%以上の配置がクリア可能です。',
    },
    {
      title: '公式「スーパー・ムーブ」計算で連番の束を一括移動',
      text: '(1 + 空きフリーセル数) × 2^(空き列数) の計算式に基づき、赤黒交互・降順のカード束をワンアクションでまとめて別列へ移動できます。',
    },
    {
      title: 'ゲーム番号（#1〜#99999）指定ディール機能',
      text: 'シード値による固定配牌に対応。名作番号を繰り返し攻略したり、友達と同じ問題番号で最小手数を競ったりできます。',
    },
    {
      title: '安全な低ランクカードの自動組札送り',
      text: '場に残しておく必要のないAや2、および逆色スートがすでに組札に揃っている安全カードを自動で組札へ送り、思考に集中できます。',
    },
    {
      title: 'ワンタップ自動移動・無制限アンドゥ・ヒント完備',
      text: 'カードをタップするだけで最適な移動先へ送るワンタップ操作と、何手でも戻せる無制限Undo、次の一手ヒントを備えています。',
    },
    {
      title: '390pxスマホ画面でも8列すべてが見やすい設計',
      text: '8列の場札と4つのフリーセル・4つの組札をスマートフォン縦画面にも美しく収めるレスポンシブ設計です。',
    },
  ],
  steps: [
    {
      title: '8列に表向きで配られたカード配置を確認',
      text: '最初にどの列の奥にA（エース）や2が埋まっているかを確認し、どの列から掘り起こすか計画を立てます。',
    },
    {
      title: '左上4つの「フリーセル」を一時退避に活用',
      text: '邪魔なカードを左上のフリーセルに1枚ずつ退避させながら、場札を赤黒交互・大きい順（K→Q→J…）に整理します。',
    },
    {
      title: '空き列とフリーセルを残してスーパー・ムーブ',
      text: 'フリーセルを埋めすぎないよう温存し、空き列を作ることで一度に動かせる連番カードの枚数が倍増します。',
    },
    {
      title: '4スートすべてAからKまで組札へ揃えてクリア',
      text: '右上4つの組札へA→2→3…→Kの順に全52枚を収めると完全クリアとなります。',
    },
  ],
  faqs: [
    {
      q: 'フリーセルは無料で遊べますか？',
      a: 'はい。ブラウザ上で登録不要・完全無料で何度でも遊べます。',
    },
    {
      q: '一度に何枚までカードをまとめて動かせますか？',
      a: '本来のルールでは1枚ずつ動かしますが、空いているフリーセルと空き列を中継する手順を自動省略する「スーパー・ムーブ」により、「(1 + 空きフリーセル数) × 2^(空き列数)」枚まで同時に移動できます。',
    },
    {
      q: 'クロンダイク（普通のソリティア）との違いは何ですか？',
      a: 'フリーセルは最初から52枚すべてが表向きで配られ、山札がありません。また空いた列にはK以外のどのカードでも置けるため、運ではなく論理パズルとして楽しめます。',
    },
    {
      q: 'フリーセルを攻略するコツはありますか？',
      a: 'フリーセル（左上4枠）をなるべく空けておくことと、早めに場札の1列を完全に空にして「空き列」を作ることが最大のコツです。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/klondike', label: 'ソリティア（クロンダイク）', description: '1枚・3枚めくり対応の王道ソリティア' },
    { href: '/blackjack', label: 'ブラックジャック（21）', description: 'ベーシックストラテジー＆確率ナビ付きのカジノカードゲーム' },
    { href: '/daifugo', label: '大富豪（大貧民）', description: '革命・8切り・階段・都落ち対応のAI 4人対戦トランプ' },
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

const pageTitle = `${game.name}｜完全情報トランプパズル無料ブラウザゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'フリーセル',
    'FreeCell 無料',
    'フリーセル ブラウザ',
    'ソリティア フリーセル',
    'トランプ パズル 無料',
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

export default function FreecellPage() {
  return (
    <main className="bg-slate-950">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <FreecellGame />
      <SeoContentSection
        variant="dark"
        eyebrow="SOLITAIRE PUZZLE GUIDE"
        title={`${game.name}の特徴とルール・攻略のコツ`}
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
