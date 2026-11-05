import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CharacterCounter } from '@/components/tools/character-counter/CharacterCounter';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/character-counter',
  name: '文字数カウンター',
  h1: '文字数カウンター｜文字・単語・UTF-8バイト数をリアルタイム集計',
  description:
    'テキストを貼り付けるだけで、文字数（Unicodeコードポイント）・UTF-16コード単位・行数・単語数・UTF-8バイト数・読了時間をその場で集計。140字・280字・400字・1000字の投稿目安も確認でき、集計結果をコピーできます。入力はブラウザ内で完結する無料ツールです。',
  category: 'テキスト / 文字数',
  features: [
    {
      title: '6つの指標をリアルタイム集計',
      text: '文字数（Unicodeコードポイント）、UTF-16コード単位、行数、単語数、UTF-8バイト数、読了時間を1画面にまとめて表示。入力と同時に更新されます。',
    },
    {
      title: '140・280・400・1000字の目安',
      text: 'SNS投稿や長文の目安になる4つの文字数と比較し、残り文字数とプログレスバーを表示。超過した場合はその字数も確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '入力したテキストはページ内の状態としてのみ扱い、サーバーへの送信やlocalStorageへの保存は行いません。登録も不要です。',
    },
    {
      title: '長文とスマートフォンに対応',
      text: '最大100,000文字まで入力でき、集計は遅延評価で実行。幅390px程度のスマートフォンでも横スクロールなしで操作できます。',
    },
  ],
  steps: [
    {
      title: 'テキストを入力する',
      text: 'テキストエリアに文章を入力するか、クリップボードから貼り付けます。改行や絵文字を含む文章もそのまま扱えます。',
    },
    {
      title: '集計結果と投稿の目安を確認する',
      text: '文字数・行数・単語数・UTF-8バイト数・読了時間を確認し、140字から1000字までの目安と比較します。',
    },
    {
      title: '集計結果をコピーするか入力を消す',
      text: '「集計結果をコピー」で各数値をまとめてクリップボードへ。「入力をクリア」でテキストを消して次の文章を入力できます。',
    },
  ],
  faqs: [
    {
      q: '文字数カウンターは無料で使えますか？',
      a: 'はい。会員登録やログインは不要で、すべての機能を無料で利用できます。',
    },
    {
      q: '入力した文章はサーバーに送信・保存されますか？',
      a: 'いいえ。入力内容はページ内の状態としてのみ扱い、サーバーへの送信やlocalStorageへの保存は行いません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。幅390px程度のスマートフォンでも、横スクロールが発生しないようにレイアウトを調整しています。文字入力とボタン操作はタッチでも行えます。',
    },
    {
      q: '単語数のカウントは正確ですか？',
      a: '単語数は日本語と英語の混在文を想定した概算です。対応ブラウザではIntl.Segmenterで区切り、未対応の場合は文字種をもとに数えます。記号・URL・固有名詞の扱いなどで実際の単語数と差が出るため、厳密な制限には文字数（コードポイント）をご利用ください。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: 'ほかの便利ツールを探す',
    },
    {
      href: '/json-formatter',
      label: 'JSONフォーマッター',
      description: 'JSONを整形して読みやすく確認する',
    },
    {
      href: '/url-encoder',
      label: 'URLエンコーダー',
      description: 'URL用に文字列をエンコード・デコードする',
    },
    {
      href: '/hash-generator',
      label: 'ハッシュ生成',
      description: 'テキストからハッシュ値を計算する',
    },
  ],
};

const title = '文字数カウンター｜文字・単語・UTF-8バイト数を無料で集計';
const description =
  '文字数（Unicodeコードポイント）・UTF-16・行数・単語数・UTF-8バイト数・読了時間をリアルタイム集計。140字・280字・400字・1000字の投稿目安も確認できる無料ツールです。';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    '文字数カウンター',
    '文字数 カウント',
    '文字数 数える',
    '単語数 カウント',
    'UTF-8 バイト数',
    'UTF-16 文字数',
    'SNS 文字数 制限',
    '140字 280字',
    '読了時間 計算',
    '無料 文字数カウンター',
  ],
  alternates: {
    canonical: seo.slug,
  },
  openGraph: {
    title,
    description,
    url: `${APP_URL}${seo.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: '文字数カウンター',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CharacterCounterPage() {
  return (
    <UtilityToolShell seo={seo}>
      <CharacterCounter />
    </UtilityToolShell>
  );
}
