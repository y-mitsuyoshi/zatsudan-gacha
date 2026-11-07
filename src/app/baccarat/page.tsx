import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import BaccaratRoyalGame from '@/components/casino/baccarat/BaccaratRoyalGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/baccarat',
  name: 'バカラ・ロイヤル',
  h1: 'バカラ・ロイヤル｜プントバンコの定番ルールを楽しめる無料カジノゲーム',
  description:
    'エメラルドとオックスブラッドのフェルトに真鍮の縁取りをあしらった、大人のための無料ブラウザバカラ「バカラ・ロイヤル」。8デッキシューと標準の3枚目ドローイングルールに基づくプントバンコを、プレイヤー・バンカー・タイの3つのベットで楽しめます。仮想チップ専用で実際のお金は使いません。',
  image: '/ogp.png',
  genre: ['カジノ', 'トランプ', 'バカラ', 'カードゲーム'],
  features: [
    {
      title: '標準ルール準拠のプントバンコ',
      text: '8デッキのシューを使い、プレイヤーとバンカーの2手に配られたカードの合計下一桁で勝敗を判定。ナチュラル8・9と、プレイヤー・バンカーの3枚目ドローイング規定を標準ルールどおりに実装しています。',
    },
    {
      title: 'プレイヤー・バンカー・タイの3点ベット',
      text: 'プレイヤー1:1、バンカー0.95:1（5%手数料を端数切り捨てで控除）、タイ8:1の配当に対応。タイ成立時はプレイヤーとバンカーへのベットがプッシュ返却されます。',
    },
    {
      title: 'カード配布アニメーションとライブスコア',
      text: '1枚ずつめくられるカードの配布演出に合わせて、両手の合計値がリアルタイムに更新されます。最後のカードが置かれると、勝敗と払戻の内訳がテーブル上に表示されます。',
    },
    {
      title: '仮想チップのバンクロール管理',
      text: '10・25・50・100・500のチップを選んでベットし、1枚戻す・クリアで自由に調整できます。ベット上限、残高不足、ディール中の操作を検証し、仮想チップがマイナスにならないよう管理します。',
    },
    {
      title: 'ラウンド履歴とセッション収支',
      text: '直近のラウンドを勝敗・スコア・収支つきで記録。連続して遊ぶときも、どのベットがどう決着したかを振り返りながらプレイできます。',
    },
    {
      title: 'サロン風のレスポンシブテーブル',
      text: '深いエメラルドのフェルト、オックスブラッドのアクセント、真鍮と木目のフレーム、明朝体の見出しで落ち着いたカジノサロンの空気を演出。390px幅のスマートフォンから1280pxのデスクトップまで快適に操作できます。',
    },
  ],
  steps: [
    {
      title: 'チップを選ぶ',
      text: '10・25・50・100・500からベットしたいチップ額を選びます。選択中のチップは真鍮のリングで表示されます。',
    },
    {
      title: 'プレイヤー・バンカー・タイにベット',
      text: 'いずれかのベットエリアをタップすると、選んだチップが置かれます。必要なら「1枚戻す」または「クリア」でベットを調整しましょう。',
    },
    {
      title: 'カードを配って勝負',
      text: '「カードを配る」を押すと、プレイヤーとバンカーに2枚ずつ配られ、必要に応じて標準ルールに従い3枚目が配られます。合計が9に近い手の勝利です。',
    },
    {
      title: '配当を確認して次のラウンドへ',
      text: '結果と払戻の内訳、更新されたバンクロールを確認し、「次のラウンド」で新しいベットへ進みます。履歴には勝敗・スコア・収支が残ります。',
    },
  ],
  faqs: [
    {
      q: 'バカラ・ロイヤルは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。使用するのはゲーム内の仮想チップのみで、実際のお金や景品のやり取りは一切ありません。',
    },
    {
      q: 'バンカーの5%手数料はどのように計算されますか？',
      a: 'バンカーが勝利した場合、ベット額に対する0.95倍の配当を端数切り捨てで計算し、残りを手数料として表示します。たとえば100チップのバンカーベットなら払戻は195チップ（利益95チップ）です。',
    },
    {
      q: 'タイにベットして引き分けになった場合はどうなりますか？',
      a: 'タイベットは8:1の配当で、ベット額を含む9倍が払い戻されます。プレイヤーまたはバンカーにベットしていた場合は、勝敗なしのプッシュとしてベット額がそのまま返却されます。',
    },
    {
      q: '3枚目を引く条件を教えてください。',
      a: 'プレイヤーは合計0〜5で3枚目を引き、6〜7では引きません。バンカーはプレイヤーがスタンドした場合は0〜5で引き、プレイヤーが3枚目を引いた場合はプレイヤーの3枚目の値に応じた標準のバンカー表で判定します。どちらかが最初の2枚で8または9のナチュラルなら、それ以上カードは配られません。',
    },
    {
      q: 'スマートフォンでも快適に遊べますか？',
      a: 'はい。390px幅のスマートフォンでもテーブル・ベットエリア・チップ・操作ボタンが画面内に収まるよう設計しています。すべての操作ボタンは44px以上のタッチターゲットです。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'カジノ・トランプ・ボードゲームをまとめて探す' },
    { href: '/roulette-casino', label: 'ルーレット・カジノ', description: '数字とカラーを予想する定番カジノホイール' },
    { href: '/video-poker', label: 'ビデオポーカー', description: '役の完成を目指すカジノ式ポーカー' },
    { href: '/texas-holdem', label: 'ロイヤル・ナイト・ポーカー', description: '本格ノーリミット・テキサスホールデム' },
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

export const metadata: Metadata = {
  title: 'バカラ・ロイヤル',
  description: game.description,
  category: 'game',
  keywords: [
    'バカラ 無料',
    'バカラ ブラウザ',
    'プントバンコ',
    'カジノゲーム 無料',
    'トランプ カジノ',
    'バカラ ルール',
    'バカラ 3枚目',
    '仮想チップ カジノ',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: 'バカラ・ロイヤル',
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'バカラ・ロイヤル',
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function BaccaratPage() {
  return (
    <main className="bg-[#0a110d]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <BaccaratRoyalGame />
      <SeoContentSection
        variant="dark"
        eyebrow="BACCARAT ROYAL SALON GUIDE"
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
