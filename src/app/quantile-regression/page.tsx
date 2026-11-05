import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { QuantileRegression } from '@/components/tools/quantile-regression/QuantileRegression';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/quantile-regression',
  name: '分位点回帰分析',
  h1: '分位点回帰分析｜CSVから分位点ごとの回帰直線と疑似R1を計算',
  description:
    'xとyのCSVを貼り付けて分位点を選ぶだけで、線形分位点回帰の切片・傾き・疑似R1を計算できる無料ツールです。散布図に分位点回帰直線と最小二乗回帰直線を重ねて表示します。',
  category: '統計 / 回帰',
  features: [
    {
      title: '分位点ごとの回帰直線を推定',
      text: '0.1〜0.9の分位点を選び、チェック関数の重みを使ったIRLSで切片と傾きを推定します。',
    },
    {
      title: '外れ値に影響されにくい分析',
      text: '中央値回帰を含む分位点回帰は、外れ値の影響を受けにくい頑健な推定方法です。',
    },
    {
      title: 'OLSとの比較を散布図で確認',
      text: '観測値の散布図に分位点回帰直線と最小二乗回帰（OLS）の参考線を重ねて表示します。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目のヘッダーを x,y とし、2行目以降に数値の組を1行ずつ入力します。カンマ・タブ区切りに対応しています。',
    },
    {
      title: '分位点を選ぶ',
      text: '0.1〜0.9の範囲から分析したい分位点を選びます。0.5を選ぶと中央値回帰になります。',
    },
    {
      title: '結果とグラフを確認する',
      text: '切片・傾き・疑似R1・サンプルサイズを確認し、散布図上の分位点回帰直線とOLS参考線を比較します。',
    },
  ],
  faqs: [
    {
      q: '分位点回帰分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '分位点とは何ですか？',
      a: '分位点は、データを小さい順に並べたときに下から何割の位置にあたるかを表します。例えば0.5は中央値、0.9は下から90%の位置です。分位点回帰では、選んだ分位点での条件付き分布の関係を直線で推定します。',
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
      href: '/multiple-regression',
      label: '重回帰分析',
      description: '複数の説明変数から目的変数を予測',
    },
    {
      href: '/time-series-analysis',
      label: '時系列分析',
      description: '時間順のデータから傾向や変化を確認',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '2つのデータの関係性を散布図と数値で確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '分位点回帰分析｜切片・傾き・疑似R1を無料計算',
  description:
    'xとyのCSVを貼り付け、分位点を選ぶだけで線形分位点回帰を計算。切片・傾き・疑似R1・サンプルサイズを表示し、散布図で分位点回帰直線とOLS参考線を比較できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '分位点回帰',
    '分位点回帰 分析',
    '中央値回帰',
    '分位点 回帰 直線',
    '疑似R1',
    'IRLS 回帰',
    '統計 回帰 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/quantile-regression',
  },
  openGraph: {
    title: '分位点回帰分析｜切片・傾き・疑似R1を無料計算',
    description:
      'xとyのCSVから線形分位点回帰を推定。切片・傾き・疑似R1を表示し、散布図で分位点回帰直線とOLS参考線を比較できます。',
    url: `${APP_URL}/quantile-regression`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '分位点回帰分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '分位点回帰分析｜切片・傾き・疑似R1を無料計算',
    description:
      'xとyのCSVから線形分位点回帰を推定。切片・傾き・疑似R1を表示し、散布図で分位点回帰直線とOLS参考線を比較できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function QuantileRegressionPage() {
  return (
    <UtilityToolShell seo={seo}>
      <QuantileRegression />
    </UtilityToolShell>
  );
}
