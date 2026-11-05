import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { TsuboConverter } from '@/components/tools/tsubo-converter/TsuboConverter';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/tsubo-converter',
  name: '坪・㎡・畳 変換＆坪単価計算',
  h1: '坪・㎡・畳 変換＆坪単価計算',
  description:
    '坪・平方メートル（㎡）・畳を相互に換算し、総額または坪単価から坪単価・㎡単価・総額を試算できる無料ツールです。1坪＝3.305785㎡を基準に、1畳の広さを地域に合わせて変更できます。',
  category: '不動産 / 面積計算',
  features: [
    {
      title: '坪・㎡・畳を3方向に換算',
      text: '入力した面積を坪・㎡・畳のすべてで表示します。1坪＝3.305785㎡を基準に、不動産の面積確認をブラウザ内で行えます。',
    },
    {
      title: '畳の広さを地域に合わせて調整',
      text: '1畳＝1.62㎡を初期値に、京間・中京間・江戸間・団地間などの目安を選んだり、任意の数値を入力したりできます。',
    },
    {
      title: '総額と坪単価から単価を試算',
      text: '総額または坪単価のどちらかを入力すると、坪単価・㎡単価・総額を自動計算。価格が未入力でも面積換算だけ利用できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '面積や価格をサーバーへ送信せず、localStorageなどにも保存しません。登録不要で、スマートフォンからも利用できます。',
    },
  ],
  steps: [
    {
      title: '面積と単位を入力する',
      text: '坪・㎡・畳のいずれかを選び、面積を入力します。入力と同時に3つの単位へ換算されます。',
    },
    {
      title: '1畳の広さを必要に応じて変える',
      text: '畳の広さは地域差があるため、1.62㎡を初期値として用意。地域別の目安を選ぶか、㎡単位で自由に変更できます。',
    },
    {
      title: '価格を入れて単価を確認する',
      text: '総額か坪単価のどちらかを任意で入力すると、坪単価・㎡単価・総額が表示されます。空欄の場合は面積換算のみです。',
    },
  ],
  faqs: [
    {
      q: '坪・㎡・畳の変換ツールは無料ですか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。利用回数の制限もありません。',
    },
    {
      q: '入力した面積や価格はサーバーに送信されますか？',
      a: 'いいえ。換算と計算はすべてブラウザ内で行い、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '畳の広さは地域によって違いますか？',
      a: 'はい。畳は地域や建物の種類によって大きさが異なり、京間・中京間・江戸間・団地間などで1畳あたりの面積が変わります。このツールでは1畳＝1.62㎡を初期値とし、地域別の目安を選ぶか任意の数値に変更できます。不動産取引では登記上の面積や地域の慣習も確認してください。',
    },
    {
      q: '坪単価はどのように計算していますか？',
      a: '坪単価は「総額 ÷ 坪数」で計算します。総額を入力した場合は坪数で割り、坪単価を入力した場合は坪数を掛けて総額を求めます。㎡単価は「総額 ÷ ㎡数」です。表示は円未満を四捨五入した概算で、実際の取引価格や諸費用とは異なる場合があります。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/home-purchase-cost',
      label: '住宅購入費用の計算',
      description: '頭金や諸費用を含めた購入費用の目安を確認',
    },
    {
      href: '/property-tax-calculator',
      label: '固定資産税の計算',
      description: '固定資産税・都市計画税の目安を試算',
    },
    {
      href: '/rent-vs-buy',
      label: '賃貸と購入の比較',
      description: '家賃と住宅ローンの負担を比較して検討',
    },
  ],
};

export const metadata: Metadata = {
  title: '坪・㎡・畳 変換＆坪単価計算｜面積と価格を無料換算',
  description:
    '坪・㎡・畳を相互変換し、総額または坪単価から坪単価・㎡単価・総額を計算。1坪＝3.305785㎡、1畳の広さは地域別に変更できる無料ツールです。登録不要・ブラウザ内で処理。',
  keywords: [
    '坪 ㎡ 変換',
    '坪 畳 変換',
    '㎡ 坪 計算',
    '坪単価 計算',
    '畳 平米 変換',
    '面積 換算',
    '不動産 面積 計算',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/tsubo-converter',
  },
  openGraph: {
    title: '坪・㎡・畳 変換＆坪単価計算｜面積と価格を無料換算',
    description:
      '坪・㎡・畳を相互変換し、総額または坪単価から坪単価・㎡単価・総額を計算。1畳の広さも地域に合わせて変更できます。',
    url: `${APP_URL}/tsubo-converter`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '坪・㎡・畳 変換＆坪単価計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '坪・㎡・畳 変換＆坪単価計算｜面積と価格を無料換算',
    description:
      '坪・㎡・畳を相互変換し、総額または坪単価から坪単価・㎡単価・総額を計算。1畳の広さも地域別に変更できる無料ツールです。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function TsuboConverterPage() {
  return (
    <UtilityToolShell seo={seo}>
      <TsuboConverter />
    </UtilityToolShell>
  );
}
