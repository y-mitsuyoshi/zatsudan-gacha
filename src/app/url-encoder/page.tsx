import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { UrlEncoder } from '@/components/tools/url-encoder/UrlEncoder';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: 'URLエンコード・デコード（無料）｜日本語・記号を安全に変換',
  description:
    'URLに日本語や記号を含めるときに使える無料のURLエンコード・デコードツール。encodeURIComponent / decodeURIComponent と encodeURI / decodeURI を切り替え、文字化けや不正な%表記もその場で確認できます。入力はブラウザ内だけで処理します。',
  keywords: [
    'URLエンコード',
    'URLデコード',
    'encodeURIComponent',
    'encodeURI',
    'パーセントエンコーディング',
    '日本語 URL 変換',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/url-encoder',
  },
  openGraph: {
    title: 'URLエンコード・デコード（無料）｜日本語・記号を安全に変換',
    description:
      'encodeURIComponent・encodeURI・decodeURIComponent・decodeURIに対応した無料ツール。日本語を保ったままURL用の文字列へ変換し、コピーや入れ替えもブラウザ内で完結します。',
    url: `${APP_URL}/url-encoder`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: 'URLエンコード・デコード' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URLエンコード・デコード（無料）｜日本語・記号を安全に変換',
    description:
      'encodeURIComponent・encodeURI・decodeURIComponent・decodeURIに対応。日本語を保ったままURL用の文字列へ変換し、コピーや入れ替えもブラウザ内で完結します。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const seo: UtilityToolSeo = {
  slug: '/url-encoder',
  name: 'URLエンコード・デコード',
  h1: 'URLエンコード・デコード',
  description:
    'URLに日本語や記号を含めるときに必要なエンコード・デコードを、ブラウザ内で安全に行える無料ツールです。encodeURIComponent / decodeURIComponent と encodeURI / decodeURI を切り替え、コピーや入れ替えもワンクリックで行えます。',
  category: 'Web / URL',
  features: [
    {
      title: '4つの変換モード',
      text: 'encodeURIComponent / decodeURIComponent と encodeURI / decodeURI をボタンで切り替え。URLの部品とURL全体を用途に合わせて変換できます。',
    },
    {
      title: '日本語をそのまま往復',
      text: '日本語はUTF-8のパーセントエンコーディングで変換。デコードすれば元の多バイト文字に戻るため、確認しながら安全に扱えます。',
    },
    {
      title: '不正な%表記を検出',
      text: '%の後ろが欠けた文字列や不正なバイト列を検出し、エラーメッセージを表示。画面が止まったり入力が消えたりしません。',
    },
    {
      title: 'コピーと入れ替えに対応',
      text: '結果をワンクリックでコピー。入力と出力を入れ替えて、エンコードとデコードを往復確認できます。',
    },
  ],
  steps: [
    {
      title: 'モードを選ぶ',
      text: '変換したい内容に合わせて、部品向けのencodeURIComponent / decodeURIComponentか、URL全体向けのencodeURI / decodeURIを選択します。',
    },
    {
      title: 'テキストを入力する',
      text: '入力欄にURLや日本語、記号を貼り付けます。変換結果は入力と同時に右側（スマホでは下）に表示されます。',
    },
    {
      title: '結果を確認してコピー',
      text: '出力を確認し、必要なら「コピー」でクリップボードへ。往復確認したいときは「入出力を入れ替え」を使います。',
    },
  ],
  faqs: [
    {
      q: '無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべての機能を無料で利用できます。',
    },
    {
      q: '入力した文字列はサーバーに送信されますか？',
      a: 'いいえ。変換・コピー・入れ替えはすべてブラウザ内のJavaScriptで処理され、外部への通信は行いません。',
    },
    {
      q: 'encodeURIComponentとencodeURIの違いは何ですか？',
      a: 'encodeURIComponentは / ? : @ & = + # などの予約文字も含めて値を丸ごと変換し、クエリ値やパス部品に向きます。encodeURIはURL全体を対象にし、URLの構造を保つ予約文字はそのまま残します。',
    },
    {
      q: '不正な%エンコードを入力するとどうなりますか？',
      a: '%の後ろが2桁の16進数でない場合や、途中で切れたバイト列がある場合は、その場でエラーメッセージを表示します。入力内容は保持されるので、修正すればすぐに再変換できます。',
    },
  ],
  related: [
    { href: '/tools', label: '無料ツール一覧', description: '他の無料Webツールを探す' },
    { href: '/json-formatter', label: 'JSONフォーマッター', description: 'JSONを見やすく整形・検証' },
    { href: '/hash-generator', label: 'ハッシュ生成', description: '文字列からハッシュ値を生成' },
    { href: '/character-counter', label: '文字数カウント', description: '文字数や単語数を数える' },
  ],
};

export default function UrlEncoderPage() {
  return (
    <UtilityToolShell seo={seo}>
      <UrlEncoder />
    </UtilityToolShell>
  );
}
