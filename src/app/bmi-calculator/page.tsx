import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { BmiCalculator } from '@/components/tools/bmi-calculator/BmiCalculator';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/bmi-calculator',
  name: 'BMI・健康計算',
  h1: 'BMI・健康計算',
  description:
    '身長と体重からBMIと日本基準の肥満度を計算し、標準体重の範囲、基礎代謝量、活動量別の推定消費カロリーを確認できる無料ツールです。年齢・性別・活動量は任意で入力でき、すべてブラウザ内で計算します。',
  category: '健康 / 計算',
  features: [
    {
      title: 'BMIと肥満度をすぐに確認',
      text: '身長と体重を入力するだけで、BMIと日本肥満学会の基準に沿ったカテゴリ（低体重・普通・肥満1〜4）を表示します。',
    },
    {
      title: '標準体重の範囲がわかる',
      text: '入力した身長に対して、BMI 18.5〜24.9に相当する体重の範囲を計算。日々の体重管理の参考にできます。',
    },
    {
      title: '基礎代謝と消費カロリーの目安',
      text: '年齢と性別を入力するとMifflin-St Jeor式で基礎代謝量を算出。活動量の係数を掛けて、1日の推定消費カロリーも表示します。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力した身長・体重・年齢などはサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: '身長と体重を入力する',
      text: '身長は100〜250cm、体重は20〜300kgの範囲で入力します。入力するとBMIと標準体重の範囲が自動で更新されます。',
    },
    {
      title: '年齢・性別・活動量を選ぶ',
      text: '基礎代謝量と推定消費カロリーを表示したい場合は、18〜120歳の年齢、性別、普段の活動量を選びます。未入力でもBMIは計算できます。',
    },
    {
      title: '結果と注意事項を確認する',
      text: 'BMIのカテゴリ、標準体重、基礎代謝量、推定消費カロリーを確認します。結果は目安なので、健康上の判断は専門家に相談してください。',
    },
  ],
  faqs: [
    {
      q: 'BMI・健康計算は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した身長・体重・年齢は保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'BMIだけで健康状態を判断できますか？',
      a: 'BMIは身長と体重から計算できる簡便な指標ですが、筋肉量や体脂肪率、骨格、年齢、妊娠などの影響は反映されません。BMIが同じでも健康状態は異なるため、単独で総合的な判断はできません。',
    },
    {
      q: '計算結果は医療的なアドバイスですか？',
      a: 'いいえ。このツールの結果は一般的な計算式による目安であり、診断や治療、食事・運動の指示ではありません。健康状態に不安がある場合や減量・増量を計画する場合は、医師や管理栄養士などの専門家にご相談ください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすいよう、縦並びのレイアウトとタップしやすい入力欄を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/unit-converter',
      label: '単位変換ツール',
      description: '長さ・重さ・温度などの単位をすばやく変換',
    },
    {
      href: '/loan-calculator',
      label: 'ローン計算ツール',
      description: '毎月の返済額と総返済額の目安を計算',
    },
    {
      href: '/character-counter',
      label: '文字数カウント',
      description: '文章の文字数や単語数をその場で確認',
    },
  ],
};

export const metadata: Metadata = {
  title: 'BMI・健康計算｜BMI・標準体重・基礎代謝・消費カロリーを無料計算',
  description:
    '身長と体重からBMIと日本基準の肥満度を計算。標準体重の範囲、Mifflin-St Jeor式による基礎代謝量、活動量別の推定消費カロリーも無料で確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    'BMI 計算',
    '標準体重 計算',
    '基礎代謝 計算',
    '消費カロリー 計算',
    '肥満度 判定',
    '健康 計算 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/bmi-calculator',
  },
  openGraph: {
    title: 'BMI・健康計算｜BMI・標準体重・基礎代謝を無料計算',
    description:
      '身長と体重からBMIと肥満度を判定。標準体重の範囲、基礎代謝量、活動量別の推定消費カロリーもブラウザ内で計算できます。',
    url: `${APP_URL}/bmi-calculator`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'BMI・健康計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BMI・健康計算｜BMI・標準体重・基礎代謝を無料計算',
    description:
      '身長と体重からBMIと肥満度を判定。標準体重の範囲、基礎代謝量、活動量別の推定消費カロリーも無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function BmiCalculatorPage() {
  return (
    <UtilityToolShell seo={seo}>
      <BmiCalculator />
    </UtilityToolShell>
  );
}
