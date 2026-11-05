import type { Metadata } from 'next';
import { JsonFormatter } from '@/components/tools/json-formatter/JsonFormatter';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';

const APP_URL = 'https://zatsudan-gacha.app';
const SLUG = '/json-formatter';
const PAGE_URL = `${APP_URL}${SLUG}`;
const TITLE = 'JSON整形・検証ツール｜無料でフォーマット・圧縮';
const DESCRIPTION =
  'JSONをブラウザ内で整形・圧縮・検証できる無料ツール。2スペース・4スペース・タブのインデント、行と文字位置つきのエラー表示、コピー、サンプル入力に対応。入力は約1MBまででサーバーへ送信されません。';

const seo: UtilityToolSeo = {
  slug: SLUG,
  name: 'JSON整形・検証',
  h1: 'JSONを整えて、壊れた場所をすぐ確認',
  description: DESCRIPTION,
  category: '開発 / JSON',
  features: [
    {
      title: '2・4スペース・タブで整形',
      text: '読みやすいインデントを選んで、階層の深いJSONも見やすく整えられます。整形結果はそのままコピーできます。',
    },
    {
      title: 'ワンクリックで圧縮',
      text: '改行や余分な空白を削除して、JSONを1行にまとめます。APIへ渡すデータや設定ファイルの軽量化に便利です。',
    },
    {
      title: '行・文字位置つきの検証',
      text: 'JSON.parseで構文を確認し、エラーがあれば行と文字位置、日本語のヒントを表示します。閉じ忘れやカンマ漏れの特定に役立ちます。',
    },
    {
      title: '入力はブラウザ内だけで処理',
      text: 'JSONはサーバーへ送信せず、動的なコード実行も行いません。登録不要で、PC・スマートフォンのどちらでも利用できます。',
    },
  ],
  steps: [
    {
      title: 'JSONを貼り付ける',
      text: '入力欄にJSONを貼り付けるか、サンプルを読み込みます。UTF-8換算で1,000,000バイト（約1MB）を超える入力は反映されません。',
    },
    {
      title: 'インデントを選んで整形する',
      text: '2スペース・4スペース・タブから好きな形式を選び、「整形する」を押します。1行にまとめたい場合は「圧縮する」を選びます。',
    },
    {
      title: '検証結果を確認してコピー',
      text: '有効・無効のステータスとエラー位置を確認し、問題がなければ出力欄の「結果をコピー」で整形後のJSONを取得できます。',
    },
  ],
  faqs: [
    {
      q: 'JSON整形・検証ツールは無料で使えますか？',
      a: 'はい。会員登録やログインは不要で、すべての機能を無料で利用できます。整形・圧縮・検証・コピーに回数制限はありません。',
    },
    {
      q: '入力したJSONはサーバーに送信されますか？',
      a: 'いいえ。JSONの解析と整形はブラウザ内のJavaScriptだけで行います。入力内容をサーバーへ送信したり、ブラウザ内に自動保存したりすることはありません。',
    },
    {
      q: '大きなJSONも処理できますか？',
      a: '入力はUTF-8換算で約1MB（1,000,000バイト）までを目安にしています。上限を超えた場合はブラウザの負荷を避けるため入力を反映せず、サイズ超過として案内します。',
    },
    {
      q: 'JSONの解析に危険なコード実行は使っていますか？',
      a: '使っていません。検証と整形にはブラウザ標準のJSON.parseとJSON.stringifyだけを使用しています。JSON内に書かれた文字列がプログラムとして実行されることはありません。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: 'プロフィール作成や診断など、他の無料ツールを探す',
    },
    {
      href: '/url-encoder',
      label: 'URLエンコード・デコード',
      description: 'URLに含める文字列を安全な形式へ変換する',
    },
    {
      href: '/hash-generator',
      label: 'ハッシュ生成',
      description: 'テキストからハッシュ値をブラウザ内で計算する',
    },
    {
      href: '/character-counter',
      label: '文字数カウント',
      description: '文章の文字数や行数をその場で確認する',
    },
  ],
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'JSON 整形',
    'JSON 検証',
    'JSON フォーマット',
    'JSON 圧縮',
    'JSON エラー 確認',
    'JSON パーサー',
    'JSON バリデーション',
    '開発 ツール',
    '無料 オンラインツール',
  ],
  alternates: {
    canonical: SLUG,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'JSON整形・検証ツール',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function JsonFormatterPage() {
  return (
    <UtilityToolShell seo={seo}>
      <JsonFormatter />
    </UtilityToolShell>
  );
}
