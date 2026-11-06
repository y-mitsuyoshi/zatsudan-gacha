import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import KlondikeGame from '@/components/cards/klondike/KlondikeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/klondike',
  name: 'ソリティア（クロンダイク）',
  h1: 'ソリティア（クロンダイク）｜1枚・3枚めくり対応の無料ブラウザトランプゲーム',
  description:
    '定番トランプパズル「ソリティア（クロンダイク）」をブラウザで今すぐ無料プレイ。標準の1枚めくりと上級の3枚めくり切替、ワンタップ自動移動、無制限アンドゥ（一手戻す）、次の一手ヒント、全カード表向き時のオートコンプリート機能を搭載したスマホ・PC対応カードゲームです。',
  image: '/ogp.png',
  genre: ['トランプ', 'カードゲーム', 'パズル', 'ソリティア'],
  features: [
    {
      title: '1枚めくり（標準）と3枚めくり（上級）をワンタップ切替',
      text: '初心者でもクリアしやすい1枚めくりモードと、山札の順番管理が重要な3枚めくりモードをいつでも切り替えて遊べます。',
    },
    {
      title: 'ワンタップ自動移動＆2タップ手動移動の両対応',
      text: 'カードをタップするだけで組札や赤黒交互の場札列へ自動移動。細かく移動先を選びたいときは2タップ選択にも対応しています。',
    },
    {
      title: 'オートコンプリートで終盤の回収も爽快',
      text: '山札・捨て札がなくなり場の全カードが表向きになると「オートコンプリート」ボタンが出現。ワンタップで52枚すべてを組札へ回収できます。',
    },
    {
      title: '無制限の「一手戻す（Undo）」と「ヒント」機能',
      text: '手順を間違えても何回でも巻き戻し可能。詰まったときはヒントボタンで次に動かせるカードをハイライト表示します。',
    },
    {
      title: 'クリアタイム・手数・連勝記録を自動保存',
      text: '手数カウンター、経過タイマー、スコア計算に加え、自己ベストタイムや累計クリア回数をブラウザに保存します。',
    },
    {
      title: '390pxスマホ画面でも見やすいベクターカード描画',
      text: 'カスタムSVGスートと視認性の高いインデックス設計により、スマートフォンの縦画面でも快適にプレイできます。',
    },
  ],
  steps: [
    {
      title: 'めくり枚数モードを選ぶ',
      text: '画面上部の「1枚めくり」または「3枚めくり」を選択してゲームを開始します。',
    },
    {
      title: '場札を赤黒交互・K→Aの降順に並べる',
      text: '7列の場札で赤（♥♦）と黒（♠♣）が交互になるよう、数字が1つ小さいカードを重ねて裏向きカードをめくります。',
    },
    {
      title: '組札（♠♥♦♣）へAからKまで順番に積む',
      text: 'A（エース）が出たら右上の組札へ移動し、同じマークで2・3…Kまで順番に積み上げます。',
    },
    {
      title: '空いた列にK（キング）を移動して展開',
      text: '場札の空いた列にはK（キング）またはKから始まる連番束を移動でき、裏向きカードの開放に役立ちます。',
    },
  ],
  faqs: [
    {
      q: 'ソリティア（クロンダイク）は無料で遊べますか？',
      a: 'はい。会員登録やアプリのダウンロード不要で、ブラウザから完全無料で何度でも遊べます。',
    },
    {
      q: '1枚めくりと3枚めくりの違いは何ですか？',
      a: '山札をタップしたときにめくられる枚数が異なります。1枚めくりはすべてのカードを順番に使えますが、3枚めくりは3枚ずつめくって一番上のカードしか使えないため戦略性が高くなります。',
    },
    {
      q: 'スマートフォンでも片手で操作できますか？',
      a: 'はい。ワンタップ自動移動機能をオンにしておけば、動かしたいカードをタップするだけで最適な組札または場札列へ移動します。',
    },
    {
      q: 'オートコンプリートはいつ使えますか？',
      a: '山札とめくり札がすべて場に出きって、7列の場札にある裏向きカードがすべて表向きになった時点で自動的にボタンが表示されます。',
    },
    {
      q: '空いた列にはどのカードを置けますか？',
      a: 'クロンダイクの公式ルールに基づき、空いた場札列にはK（キング）またはKを先頭とする連番の束のみ配置できます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: '定番トランプ・ボードゲーム・パズルをまとめて探す' },
    { href: '/freecell', label: 'フリーセル', description: '全カード表向きから始まる完全情報ソリティアパズル' },
    { href: '/blackjack', label: 'ブラックジャック（21）', description: 'ベーシックストラテジー期待値ナビ付きの本格カジノカードゲーム' },
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

const pageTitle = `${game.name}｜1枚・3枚めくり対応の無料トランプゲーム`;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ソリティア',
    'クロンダイク',
    'トランプ 無料',
    'ソリティア 無料 ブラウザ',
    '1枚めくり ソリティア',
    '3枚めくり ソリティア',
    'カードゲーム 無料',
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

export default function KlondikePage() {
  return (
    <main className="bg-slate-950">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <KlondikeGame />
      <SeoContentSection
        variant="dark"
        eyebrow="CLASSIC CARD GAME GUIDE"
        title={`${game.name}の特徴とルール・遊び方`}
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
