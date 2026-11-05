import type { Metadata } from 'next';
import { HashGenerator } from '@/components/tools/hash-generator/HashGenerator';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';

const APP_URL = 'https://zatsudan-gacha.app';
const SLUG = '/hash-generator';
const PAGE_URL = `${APP_URL}${SLUG}`;
const TITLE = 'ハッシュ生成（SHA-256 / SHA-384 / SHA-512）｜無料オンラインツール';
const DESCRIPTION =
  'テキストからSHA-256・SHA-384・SHA-512のハッシュ値を生成できる無料ツール。入力はWeb Crypto APIでブラウザ内だけで処理し、サーバーへ送信しません。16進数の結果をコピーでき、スマートフォンにも対応しています。';

const seo: UtilityToolSeo = {
  slug: SLUG,
  name: 'ハッシュ生成（SHA）',
  h1: 'テキストからSHAハッシュを生成',
  description: DESCRIPTION,
  category: 'セキュリティ / ハッシュ',
  features: [
    {
      title: '入力はブラウザ内で完結',
      text: 'Web Crypto APIのcrypto.subtle.digestとTextEncoderを使い、入力したテキストを端末内だけで処理します。サーバーへの送信やlocalStorageへの保存は行いません。',
    },
    {
      title: 'SHA-256・SHA-384・SHA-512に対応',
      text: '用途に合わせて3つのSHA-2アルゴリズムを選べます。結果は16進数のダイジェストとして表示され、文字数もその場で確認できます。',
    },
    {
      title: '入力と同時に自動計算',
      text: 'テキストを入力するかアルゴリズムを切り替えると、自動でハッシュ値を更新します。計算中はコピーとクリアを無効化し、二重操作を防ぎます。',
    },
    {
      title: 'スマートフォンでも扱いやすい',
      text: '390px幅でも横にはみ出さないレイアウトと、折り返し表示されるダイジェストを用意しています。登録やログインは不要です。',
    },
  ],
  steps: [
    {
      title: 'ハッシュ化するテキストを入力する',
      text: '入力欄にテキストを貼り付けるか直接入力します。改行やスペースも含めて、入力した文字列そのものが計算対象です。',
    },
    {
      title: 'アルゴリズムを選ぶ',
      text: 'SHA-256・SHA-384・SHA-512から選びます。一般的な用途ならSHA-256、より長いダイジェストが必要ならSHA-384やSHA-512を選びます。',
    },
    {
      title: 'ハッシュ値を確認してコピーする',
      text: '表示された16進数のハッシュ値を確認し、必要に応じてコピーします。クリアを押すと入力と結果をまとめてリセットできます。',
    },
  ],
  faqs: [
    {
      q: 'ハッシュ生成（SHA）は無料で使えますか？',
      a: 'はい。登録やログインは不要で、SHA-256・SHA-384・SHA-512の生成とコピーを無料で利用できます。回数制限はありません。',
    },
    {
      q: '入力したテキストはサーバーに送信されますか？',
      a: 'いいえ。テキストはWeb Crypto APIを使ってブラウザ内だけで処理し、サーバーへ送信しません。localStorageなどのブラウザ保存も行いません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'SHA-256・SHA-384・SHA-512はどう違いますか？',
      a: 'いずれもSHA-2ファミリーの一方向ハッシュ関数です。出力はSHA-256が256ビット（16進数64文字）、SHA-384が384ビット（16進数96文字）、SHA-512が512ビット（16進数128文字）です。一般的な用途ではSHA-256、より長いダイジェストが必要な場合はSHA-384やSHA-512を選びます。',
    },
    {
      q: 'パスワードの保存に使えますか？',
      a: 'そのままではおすすめしません。ハッシュは一方向ですが、単純なハッシュは総当たり攻撃やレインボーテーブル攻撃に弱いためです。パスワードを保存する場合は、ユーザーごとのソルトとArgon2・bcrypt・scryptなどのKDF（鍵導出関数）を使い、適切なコスト設定を行ってください。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える他の便利ツールを探す',
    },
    {
      href: '/password-generator',
      label: 'パスワード生成ツール',
      description: '推測されにくいパスワードを作成する',
    },
    {
      href: '/json-formatter',
      label: 'JSON整形・検証',
      description: 'JSONを整形・圧縮・検証する',
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
    'ハッシュ生成',
    'SHA-256',
    'SHA-384',
    'SHA-512',
    'ハッシュ値 計算',
    'テキスト ハッシュ',
    'SHA ハッシュ ツール',
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
        alt: 'ハッシュ生成（SHA）',
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

export default function HashGeneratorPage() {
  return (
    <UtilityToolShell seo={seo}>
      <HashGenerator />
    </UtilityToolShell>
  );
}
