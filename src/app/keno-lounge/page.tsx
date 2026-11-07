import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import KenoLoungeGame from '@/components/casino/keno-lounge/KenoLoungeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/keno-lounge',
  name: 'ケノ・ラウンジ',
  h1: 'ケノ・ラウンジ｜1〜80から20球を抽選する無料ブラウザ・ケノゲーム',
  description:
    '真鍮と深緑のフェルトが映えるプライベートサロンで遊ぶ、完全無料のブラウザ・ケノゲーム。1〜80のボードから好きな番号を1〜10個選び、ベットして20球を抽選。的中数に応じた配当、ライブ的中表示、ラウンド履歴、配当表、ルール説明を備えています。ゲーム内のバーチャルクレジットのみを使用し、実際のお金を賭ける要素はありません。',
  image: '/ogp.png',
  genre: ['カジノ', '数字ゲーム', '抽選', 'ブラウザゲーム'],
  features: [
    {
      title: '1〜80から20球を抽選する本格ケノ',
      text: '80個の番号から選んだ1〜10個と、ランダムに抽選される20球を照合。ボード上では選択・的中・抽選済みの状態を色分けし、抽選中は球が1つずつ真鍮のトレイに現れます。',
    },
    {
      title: '1〜10個の自由選択とライブ的中カウント',
      text: '好きな番号をタップするだけで最大10個まで選択でき、抽選中も的中数がリアルタイムで更新されます。最大数を超える選択や抽選中の番号変更は無効化されます。',
    },
    {
      title: '選択数に連動する5段階の配当表',
      text: '1〜10個の選択数に合わせて配当表が切り替わり、現在のベット額での配当額も同時に確認できます。配当は抽選終了後に一度だけ精算され、二重加算されません。',
    },
    {
      title: '仮想クレジットと直近12ラウンドの履歴',
      text: '初期クレジットは2,000cr。10・25・50・100crからベットを選び、選択数・的中数・ベット・配当・収支を履歴に記録します。換金や課金はできず、娯楽用のシミュレーションとして遊べます。',
    },
    {
      title: '真鍮・ダークウッド・深緑フェルトのラウンジデザイン',
      text: 'ネオンやガラスを使わず、木目、真鍮のプレート、クリーム色のセリフ体で構成したプライベートサロン風のUI。数字盤、抽選トレイ、配当表、履歴をひとつのテーブルにまとめています。',
    },
    {
      title: '390pxのスマートフォンから1280pxのPCまで快適操作',
      text: 'スマートフォンでは8列、デスクトップでは10列に並ぶレスポンシブな番号ボードを採用。番号・ベット・抽選・リセット・ヘルプの各操作は44px以上のタッチ領域を確保しています。',
    },
  ],
  steps: [
    {
      title: 'ベット額を選ぶ',
      text: '10・25・50・100crから1回の抽選に使うベット額を選択します。ベットは抽選開始時にクレジットから消費されます。',
    },
    {
      title: '1〜10個の番号を選ぶ',
      text: '1〜80のボードから好きな番号をタップします。選択中の番号をもう一度押すと解除され、最大10個まで選べます。',
    },
    {
      title: '20球の抽選を見守る',
      text: '「20球を抽選する」を押すと、20個の番号が順番に公開されます。選んだ番号と一致した球は、ボード上で真鍮色の的中マスに変わります。',
    },
    {
      title: '的中数と配当を確認する',
      text: '抽選終了後、選択数と的中数に応じた配当が一度だけ加算されます。結果と履歴を確認し、同じ番号で再挑戦するか選び直しましょう。',
    },
  ],
  faqs: [
    {
      q: 'ケノ・ラウンジは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。ダウンロードや会員登録は不要です。使用するのはゲーム内のバーチャルクレジットのみで、購入や換金はできません。',
    },
    {
      q: '番号は何個まで選べますか？',
      a: '1〜80のボードから1個以上10個まで選べます。11個目を選ぼうとした場合は選択されず、上限の案内が表示されます。抽選中は番号の変更やベットの変更はできません。',
    },
    {
      q: '配当はどのように決まりますか？',
      a: '選択数ごとに配当表が用意されており、20球のうち選んだ番号が何個含まれたかで倍率が決まります。配当は「ベット額 × 倍率」で、抽選終了後に一度だけクレジットへ加算されます。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。スマートフォンでは番号ボードが8列に並び、390px幅でも横スクロールなしで操作できます。ベット、抽選、リセット、ヘルプなどのボタンは44px以上のタッチ領域を確保しています。',
    },
    {
      q: '履歴やクレジットは保存されますか？',
      a: 'ラウンド履歴はプレイ中に直近12回分を表示します。ページを再読み込みすると初期クレジット2,000crの状態に戻り、履歴は消去されます。リセットボタンでもクレジットと履歴を初期状態に戻せます。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'カジノ・カード・ボードゲームをまとめて探す' },
    { href: '/video-poker', label: 'ビデオポーカー', description: '役と配当表を見ながら楽しむカジノカードゲーム' },
    { href: '/roulette-casino', label: 'ルーレット・カジノ', description: '数字とカラーを予想する定番カジノテーブル' },
    { href: '/dice-casino', label: 'ダイス・カジノ', description: 'サイコロの出目を予想するシンプルなカジノゲーム' },
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

const pageTitle = game.name;

export const metadata: Metadata = {
  title: pageTitle,
  description: game.description,
  category: 'game',
  keywords: [
    'ケノ 無料',
    'ケノ ブラウザゲーム',
    'keno ゲーム',
    'カジノ ゲーム 無料',
    '数字 抽選 ゲーム',
    '20球 ケノ',
    '仮想クレジット カジノ',
    '無料 ブラウザゲーム 登録不要',
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

export default function KenoLoungePage() {
  return (
    <main className="bg-[#120c08]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <KenoLoungeGame />
      <SeoContentSection
        variant="dark"
        eyebrow="KENO LOUNGE — SALON RULES & GUIDE"
        title={`${game.name}の特徴と遊び方`}
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
