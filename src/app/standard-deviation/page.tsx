import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { StandardDeviation } from '@/components/tools/standard-deviation/StandardDeviation';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/standard-deviation',
  name: '標準偏差・分散計算',
  h1: '標準偏差・分散計算｜平均・中央値・変動係数からデータのばらつきを確認',
  description:
    'カンマ・スペース・改行で区切った数値から、平均・中央値・範囲・分散・標準偏差・変動係数を計算できる無料ツールです。母集団と標本を切り替えられ、値の分布をヒストグラムで確認できます。',
  category: '統計 / 計算',
  features: [
    {
      title: '母集団と標本を切り替えて計算',
      text: 'データ全体の母集団と、全体の一部である標本を選べます。分散は母集団ならn、標本ならn−1で割って計算します。',
    },
    {
      title: '基本統計量をまとめて確認',
      text: 'データ数、合計、平均、中央値、最小値、最大値、範囲も同時に表示。コピーした数値を貼り付けるだけで計算できます。',
    },
    {
      title: 'ヒストグラムで分布を可視化',
      text: '入力した値の分布を件数別のヒストグラムで表示。平均の位置も点線で確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力した数値はサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: '数値を貼り付ける',
      text: 'カンマ、スペース、改行のいずれかで区切って、2つ以上の数値を入力します。小数や負の数、指数表記にも対応しています。',
    },
    {
      title: '母集団か標本を選ぶ',
      text: '入力したデータが全体なら母集団、全体の一部なら標本を選びます。選択に合わせて分散・標準偏差・変動係数の表示と計算式が切り替わります。',
    },
    {
      title: '結果と分布を確認する',
      text: '平均や中央値などの基本統計量、分散、標準偏差、変動係数、ヒストグラムを確認します。計算式もあわせて表示されます。',
    },
  ],
  faqs: [
    {
      q: '標準偏差・分散計算は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した数値は保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '母集団と標本はどう選べばよいですか？',
      a: '入力したデータが対象全体を網羅している場合は母集団を選び、分散はnで割ります。データが全体の一部で、全体のばらつきを推定したい場合は標本を選び、n−1で割る不偏分散を使います。',
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
      href: '/deviation-score',
      label: '偏差値計算',
      description: '平均と標準偏差から偏差値をすばやく計算',
    },
    {
      href: '/correlation-coefficient',
      label: '相関係数計算',
      description: '2つのデータの関係性を数値で確認',
    },
    {
      href: '/statistics-graph',
      label: '統計グラフ作成',
      description: 'データをグラフにして傾向をわかりやすく可視化',
    },
  ],
};

export const metadata: Metadata = {
  title: '標準偏差・分散計算｜平均・中央値・変動係数を無料計算',
  description:
    'カンマ・スペース・改行で区切った数値から、平均・中央値・範囲・分散・標準偏差・変動係数を計算。母集団と標本の切り替え、ヒストグラムによる分布確認も無料で利用できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '標準偏差 計算',
    '分散 計算',
    '母集団 標準偏差',
    '標本 標準偏差',
    '変動係数 計算',
    '平均 中央値 計算',
    '統計 計算 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/standard-deviation',
  },
  openGraph: {
    title: '標準偏差・分散計算｜平均・中央値・変動係数を無料計算',
    description:
      'カンマ・スペース・改行で区切った数値から、平均・中央値・分散・標準偏差・変動係数を計算。母集団と標本の切り替えやヒストグラムも利用できます。',
    url: `${APP_URL}/standard-deviation`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '標準偏差・分散計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '標準偏差・分散計算｜平均・中央値・変動係数を無料計算',
    description:
      'カンマ・スペース・改行で区切った数値から、平均・中央値・分散・標準偏差・変動係数を計算。母集団と標本の切り替えやヒストグラムも無料で利用できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function StandardDeviationPage() {
  return (
    <UtilityToolShell seo={seo}>
      <StandardDeviation />
    </UtilityToolShell>
  );
}
