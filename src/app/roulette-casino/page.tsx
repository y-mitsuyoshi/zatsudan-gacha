import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import GrandRouletteGame from '@/components/casino/roulette-casino/GrandRouletteGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/roulette-casino',
  name: 'グランド・ルーレット',
  h1: 'グランド・ルーレット｜0-36の欧州式シングルゼロを仮想チップで楽しむ無料カジノゲーム',
  description:
    '0から36までの欧州式シングルゼロ・ルーレットを、ブラウザで無料プレイ。回転するSVGホイール、赤・黒・奇数・偶数・ハイ・ロー・ダズン・ストレートのベッティングボード、4種類のチップ、残高管理、払戻計算、ラウンド履歴、ルール表示を備えています。使用するのはゲーム内の仮想チップのみで、実際のお金は一切使いません。',
  image: '/ogp.png',
  genre: ['カジノ', 'ルーレット', 'テーブルゲーム'],
  features: [
    {
      title: '0-36を備えた欧州式シングルゼロ・ホイール',
      text: '緑の0と赤・黒の1から36まで、全37ポケットを1つのSVGホイールに描画。木目と真鍮のリム、数字リング、固定ポインターとボールでクラシックなルーレットの佇まいを再現しています。',
    },
    {
      title: '本格的なベッティングボード',
      text: 'ストレートの各番号に加え、赤・黒、奇数・偶数、1-18・19-36、第1〜第3ダズンをワンタップで配置可能。デスクトップでは12列×3段、スマートフォンでは3列×12段の見やすい盤面に切り替わります。',
    },
    {
      title: '4種類のチップと残高管理',
      text: '10・50・100・500の仮想チップを選び、1万チップの残高からベットします。配置額は即座に残高から差し引かれ、残高を超えるベットや不正な賭けは受け付けません。',
    },
    {
      title: 'スピン演出と結果の記録',
      text: 'スピン時だけ結果を抽選し、当選ポケットがポインターの位置に止まるようホイールが減速回転します。色・番号・ベット額・払戻・収支をラウンド履歴と直近結果に記録します。',
    },
    {
      title: '正確な払戻計算と二重払戻の防止',
      text: 'ストレートは35:1、ダズンは2:1、イーブンマネーは1:1で計算し、賭け金を含む払戻を結果確定後に一度だけ残高へ加算。配置中のベットには当選時の払戻額と最高払戻を表示します。',
    },
    {
      title: 'ルール・ヘルプとレスポンシブ設計',
      text: '遊び方と配当表をその場で確認でき、ベットのクリアやセッションのリセットにも対応。390px幅のスマートフォンからデスクトップまで、盤面とボタンが崩れないレイアウトです。',
    },
  ],
  steps: [
    {
      title: 'チップを選ぶ',
      text: 'チップトレイから10・50・100・500のいずれかを選びます。選択中の額は常に表示されます。',
    },
    {
      title: 'ベッティングボードに配置する',
      text: '番号または赤・黒・奇数・偶数・ハイ・ロー・ダズンのマスをタップすると、選択中のチップが置かれます。合計ベットと当選時の払戻はベット一覧で確認できます。',
    },
    {
      title: 'スピンして結果を待つ',
      text: 'スピンボタンを押すとホイールが回転し、0から36のいずれかに停止します。回転中はベットの変更やリセットはできません。',
    },
    {
      title: '払戻を確認して次のラウンドへ',
      text: '当選したベットの払戻が残高に加算され、ベットは自動でクリアされます。履歴を見ながら、クリアやリセットで新しいセッションも始められます。',
    },
  ],
  faqs: [
    {
      q: 'グランド・ルーレットは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。使用するのはゲーム内の仮想チップのみで、実際のお金の支払い・受け取りは発生しません。',
    },
    {
      q: '0が出たときの扱いを教えてください',
      a: '0は緑のポケットで、ストレート0は当たり、赤・黒・奇数・偶数・1-18・19-36・ダズンのベットはすべて外れます。欧州式シングルゼロの標準ルールです。',
    },
    {
      q: '配当はどのように計算されますか？',
      a: 'ストレートは35:1（賭け金を含む36倍）、ダズンは2:1（同3倍）、赤・黒・奇数・偶数・ハイ・ローは1:1（同2倍）で計算します。当選したベットの払戻だけが、結果確定後に一度だけ残高へ加算されます。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。390px幅の縦画面でも横スクロールが発生しないよう、ベッティングボードを3列×12段に切り替えています。チップやベットマスはタップしやすい大きさで表示されます。',
    },
    {
      q: 'ベットの取り消しやリセットはできますか？',
      a: '回転していない間は「ベットをクリア」で配置額が残高に戻ります。「リセット」では残高・履歴・ベットを初期状態に戻して新しいセッションを始められます。回転中は誤操作防止のため両方とも無効になります。',
    },
  ],
  related: [
    { href: '/games', label: '無料ブラウザゲーム一覧', description: 'カジノ・カード・ボードゲームをまとめて探す' },
    { href: '/baccarat', label: 'バカラ', description: '配当と流れを楽しむカジノカードゲーム' },
    { href: '/dice-casino', label: 'ダイス・カジノ', description: 'ダイスの目を予想する無料カジノゲーム' },
    { href: '/texas-holdem', label: 'テキサスホールデム', description: '個性派キャラと対戦できる本格ポーカー' },
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

const pageTitle = `${game.name}｜欧州式シングルゼロの無料カジノゲーム`;

export const metadata: Metadata = {
  title: game.name,
  description: game.description,
  category: 'game',
  keywords: [
    'グランド・ルーレット',
    'ルーレット 無料',
    'ルーレット ブラウザ',
    '欧州式ルーレット',
    'シングルゼロ ルーレット',
    'カジノゲーム 無料',
    '仮想チップ カジノ',
    'ベッティングボード',
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

export default function RouletteCasinoPage() {
  return (
    <main className="bg-[#0b120f]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <GrandRouletteGame />
      <SeoContentSection
        variant="dark"
        eyebrow="GRAND ROULETTE — EUROPEAN SINGLE ZERO GUIDE"
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
