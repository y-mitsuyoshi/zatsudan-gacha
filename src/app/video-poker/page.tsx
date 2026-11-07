import type { Metadata } from 'next';
import type { GameSeoData } from '@/lib/gameSeoData';
import { buildGameJsonLd } from '@/lib/gameSeoData';
import VideoPokerLoungeGame from '@/components/casino/video-poker/VideoPokerLoungeGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { JsonLd } from '@/components/seo/JsonLd';

const APP_URL = 'https://zatsudan-gacha.app';

const game: GameSeoData = {
  slug: '/video-poker',
  name: 'ビデオポーカー・ラウンジ',
  h1: 'ビデオポーカー・ラウンジ｜ジャックス・オア・ベターを楽しむ無料5カードドロー',
  description:
    'ダークウッドと深緑のフェルト、真鍮の縁取りが印象的なラウンジで遊ぶ、無料のビデオポーカー。ジャックス・オア・ベターの5カードドローを採用し、1〜5クレジットのベット、カードのHOLD、DRAWでの交換、配当表、ハンド履歴、仮想クレジットのリセットまでブラウザだけで楽しめます。現金や景品との交換は一切ありません。',
  image: '/ogp.png',
  genre: ['カードゲーム', 'ポーカー', 'ビデオポーカー', 'カジノ'],
  features: [
    {
      title: '本格ジャックス・オア・ベターの5カードドロー',
      text: '5枚のカードから残したいものを選び、不要なカードだけを交換するクラシックなビデオポーカー。ジャック以上のワンペアから配当が発生し、ロイヤルフラッシュ、ストレートフラッシュ、フォーカード、フルハウス、フラッシュ、ストレート、スリーカード、ツーペアまで判定します。',
    },
    {
      title: '1〜5クレジットのベットと最大ベット特典',
      text: 'ベットは1〜5クレジット。配当表には各ベット額ごとの払戻を表示し、現在のベット列と成立した役の行を強調します。5クレジットベット時のみロイヤルフラッシュが4,000クレジットになる、ビデオポーカー定番の最大ベット特典も再現しています。',
    },
    {
      title: 'タップでHOLD、DRAWで交換する明快な操作',
      text: 'カードをタップするとHOLD、もう一度タップすると解除。残すカードを選んだらDRAWを押すだけで、未HOLDのカードだけが山札から交換されます。確定後はカードが再操作できないため、誤操作や二重精算を防ぐ設計です。',
    },
    {
      title: '配当表ハイライトとハンド履歴',
      text: '成立した役は配当表で強調され、勝敗と配当額はフィードバック欄に表示されます。直近8ハンドの結果、使用した5枚、ベット額、払戻、収支をハンド履歴に残せるため、HOLD判断の振り返りにも役立ちます。',
    },
    {
      title: '仮想クレジットの安全な管理とリセット',
      text: '開始時の仮想クレジットは1,000。ベットはクレジットの範囲内でのみ受け付け、クレジットがマイナスになることはありません。配当は1回のDRAWにつき1度だけ加算され、不足時はリセットで1,000クレジットに戻せます。',
    },
    {
      title: 'スマートフォンからPCまで快適なラウンジUI',
      text: '390px幅のスマートフォンでも横スクロールが発生しないレイアウトと、44px以上のタッチターゲットを確保。1280pxのPCでは配当表とゲームテーブル、履歴・ルールをバランスよく並べ、ダークウッド、フェルト、真鍮、クリーム色のセリフ体で落ち着いたラウンジの雰囲気を演出します。',
    },
  ],
  steps: [
    {
      title: 'ベット額を1〜5クレジットから選ぶ',
      text: 'テーブル下部のベットボタンで1〜5クレジットを選択します。5クレジットを選ぶと、ロイヤルフラッシュ成立時に最大4,000クレジットの配当を狙えます。',
    },
    {
      title: 'DEALで5枚のカードを受け取る',
      text: 'DEALを押すとベット額が差し引かれ、5枚のカードが配られます。配当表の現在のベット列を確認しながら、手札の役や伸びしろを見極めましょう。',
    },
    {
      title: '残したいカードをタップしてHOLD',
      text: '保持したいカードをタップするとHOLD表示が点灯します。もう一度タップすれば解除できます。未HOLDの枚数は手札上部に表示され、DRAWで交換される枚数がひと目で分かります。',
    },
    {
      title: 'DRAWで交換し、配当と履歴を確認する',
      text: 'DRAWを押すと未HOLDのカードだけが交換され、最終的な役と配当が確定します。結果はフィードバック欄と配当表、ハンド履歴に反映され、そのまま次のハンドへ進めます。',
    },
  ],
  faqs: [
    {
      q: 'ビデオポーカー・ラウンジは無料で遊べますか？',
      a: 'はい。ブラウザで開くだけで無料で遊べます。会員登録やダウンロードは不要です。ゲーム内で使用するのは仮想クレジットのみで、実際のお金を賭ける機能や現金・景品との交換は一切ありません。',
    },
    {
      q: 'ジャックス・オア・ベターとは何ですか？',
      a: '5枚のカードで役を作るポーカーの一種で、ジャック・クイーン・キング・エースのいずれかのワンペア以上で配当が発生します。10以下のペアや役なしは配当対象外です。',
    },
    {
      q: '配当額はどのように決まりますか？',
      a: '配当表の役ごとのクレジット数にベット額を掛けて算出します。たとえばツーペアは1クレジットベットで2クレジット、3クレジットベットで6クレジットです。ロイヤルフラッシュのみ5クレジットベット時に4,000クレジットとなります。',
    },
    {
      q: 'クレジットが少なくなったらどうすればいいですか？',
      a: 'ベット額をクレジット以下に変更するか、リセットを押してください。リセットで仮想クレジットが1,000に戻り、ハンド履歴も初期化されます。クレジットが不足した状態でDEALを押しても、クレジットがマイナスになることはありません。',
    },
    {
      q: 'スマートフォンでも快適に遊べますか？',
      a: 'はい。390px幅のスマートフォンでも横スクロールが出ないように調整し、カード、ベット、DEAL・DRAW、リセットなどの操作要素は44px以上のタッチターゲットを確保しています。PCでは1280px幅でテーブルと配当表、履歴を並べたレイアウトになります。',
    },
  ],
  related: [
    {
      href: '/games',
      label: '無料ブラウザゲーム一覧',
      description: 'カードゲームやカジノゲームをまとめて探す',
    },
    {
      href: '/baccarat',
      label: 'バカラ',
      description: 'プレイヤーとバンカーの勝負を楽しむ仮想クレジット制カードゲーム',
    },
    {
      href: '/keno-lounge',
      label: 'キノ・ラウンジ',
      description: '数字を選んで抽選結果を待つラウンジ系カジノゲーム',
    },
    {
      href: '/texas-holdem',
      label: 'ロイヤル・ナイト・ポーカー（テキサスホールデム）',
      description: '個性豊かなキャラクターと対戦できる本格テキサスホールデム',
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

const pageTitle = 'ビデオポーカー・ラウンジ';

export const metadata: Metadata = {
  title: { absolute: pageTitle },
  description: game.description,
  category: 'game',
  keywords: [
    'ビデオポーカー 無料',
    'ビデオポーカー ブラウザ',
    'ジャックスオアベター 無料',
    '5カードドロー ポーカー',
    'ビデオポーカー ラウンジ',
    'カジノ カードゲーム 無料',
    '仮想クレジット ポーカー',
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

export default function VideoPokerPage() {
  return (
    <main className="bg-[#171009]">
      <JsonLd data={pageJsonLd} />
      <h1 className="sr-only">{game.h1}</h1>
      <VideoPokerLoungeGame />
      <SeoContentSection
        variant="dark"
        eyebrow="VIDEO POKER LOUNGE — JACKS OR BETTER GUIDE"
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
