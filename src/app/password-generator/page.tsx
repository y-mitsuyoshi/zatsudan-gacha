import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { PasswordGenerator } from '@/components/tools/password-generator/PasswordGenerator';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: 'パスワード生成（無料）｜長さ・文字種を指定して安全な乱数で作成',
  description:
    '長さ8〜64文字、大文字・小文字・数字・記号を選んでパスワードを生成できる無料ツール。crypto.getRandomValuesによる偏りのない乱数を使い、選んだ文字種を最低1文字ずつ含めます。1個または5個まとめて生成でき、強度の目安・コピー・再生成・クリアに対応。生成結果はサーバーへ送信せず、保存もしません。',
  keywords: [
    'パスワード生成',
    'パスワード 作成',
    '安全なパスワード',
    'ランダム パスワード',
    'パスワード 強度',
    '8文字 64文字',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/password-generator',
  },
  openGraph: {
    title: 'パスワード生成（無料）｜長さ・文字種を指定して安全な乱数で作成',
    description:
      '8〜64文字、大文字・小文字・数字・記号に対応した無料のパスワード生成ツール。1個または5個まとめて生成でき、強度の目安とコピー機能を備えています。',
    url: `${APP_URL}/password-generator`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}/ogp.png`, width: 1200, height: 630, alt: 'パスワード生成' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'パスワード生成（無料）｜長さ・文字種を指定して安全な乱数で作成',
    description:
      '8〜64文字、大文字・小文字・数字・記号に対応した無料のパスワード生成ツール。1個または5個まとめて生成でき、強度の目安とコピー機能を備えています。',
    images: [`${APP_URL}/ogp.png`],
  },
};

const seo: UtilityToolSeo = {
  slug: '/password-generator',
  name: 'パスワード生成',
  h1: 'パスワード生成',
  description:
    '長さと文字種を選んで、ブラウザ内だけでランダムなパスワードを作成できる無料ツールです。crypto.getRandomValuesによる偏りのない乱数を使い、選んだ文字種を最低1文字ずつ含めます。1個または5個まとめて生成でき、強度の目安・コピー・再生成・クリアに対応しています。',
  category: 'セキュリティ / パスワード',
  features: [
    {
      title: '偏りのない乱数で生成',
      text: 'ブラウザの暗号学的乱数（crypto.getRandomValues）を使い、剰余の偏りを避けるリジェクションサンプリングで1文字ずつ選択します。',
    },
    {
      title: '長さと文字種を柔軟に設定',
      text: '8〜64文字の範囲で長さを指定し、大文字・小文字・数字・記号を組み合わせられます。0/O/1/l/I/| などの紛らわしい文字は任意で除外できます。',
    },
    {
      title: '選んだ文字種を必ず含める',
      text: '選択した文字種ごとに最低1文字を確保してからシャッフルするため、数字を選んだのに1文字も入らない、といった偏りを防ぎます。',
    },
    {
      title: '1個または5個まとめて生成',
      text: '用途に合わせて1個ずつ確認したり、5個まとめて生成して比較したりできます。強度の目安を確認し、コピー・再生成・クリアができます。',
    },
  ],
  steps: [
    {
      title: '長さと文字種を選ぶ',
      text: 'スライダーまたは数値入力で8〜64文字の長さを指定し、使いたい文字種にチェックを入れます。必要に応じて紛らわしい文字の除外も選びます。',
    },
    {
      title: '生成数を選んで生成する',
      text: '1個または5個を選び、「パスワードを生成」を押します。選択した文字種がそれぞれ最低1文字含まれるように生成されます。',
    },
    {
      title: '強度を確認してコピーする',
      text: '長さと文字種から計算した強度の目安を確認し、パスワードをコピーします。別の候補が必要なときは再生成し、不要になったらクリアします。',
    },
  ],
  faqs: [
    {
      q: 'パスワード生成は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべての機能を無料で利用できます。課金や生成回数の制限もありません。',
    },
    {
      q: '生成したパスワードは送信・保存されますか？',
      a: 'いいえ。生成、強度計算、コピーはすべてブラウザ内で処理され、外部への通信やブラウザ内への保存、パスワードのログ出力は行いません。ページを閉じると生成結果は消えます。ただし、コピーした内容はクリップボードや貼り付け先に残るため、取り扱いに注意してください。',
    },
    {
      q: '強度表示は安全性を保証しますか？',
      a: 'いいえ。強度は文字数と文字種の組み合わせから求めたエントロピーの目安で、実際の安全性を保証するものではありません。サービスごとに異なるパスワードを使い、パスワード管理アプリでの保管や二段階認証の有効化も検討してください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも、スライダー・数値入力・チェックボックス・コピー操作がしやすい縦並びのレイアウトにしています。PCでも同じように利用できます。',
    },
  ],
  related: [
    { href: '/tools', label: '無料ツール一覧', description: '登録不要で使える他の便利ツールを探す' },
    { href: '/hash-generator', label: 'ハッシュ生成', description: '文字列からハッシュ値を作成・確認' },
    { href: '/url-encoder', label: 'URLエンコード・デコード', description: '日本語や記号をURL用の文字列に変換' },
    { href: '/json-formatter', label: 'JSONフォーマッター', description: 'JSONを見やすく整形・検証' },
  ],
};

export default function PasswordGeneratorPage() {
  return (
    <UtilityToolShell seo={seo}>
      <PasswordGenerator />
    </UtilityToolShell>
  );
}
