import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CorrelationAnalysis } from '@/components/tools/correlation-analysis/CorrelationAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/correlation-analysis',
  name: '相関分析',
  h1: '相関分析（相関行列）：複数変数の関係をヒートマップと散布図で確認',
  description:
    '2〜8個の数値変数を含むCSVを貼り付けると、ピアソンの相関行列、ペアごとのサンプル数と両側p値、強い正負のペア、散布図と回帰直線を表示する無料ツールです。計算はすべてブラウザ内で完結します。',
  category: '統計 / 相関',
  features: [
    {
      title: '相関行列をヒートマップで表示',
      text: '2〜8個の数値変数からピアソンの相関係数を計算し、正の相関は赤系、負の相関は青系の色で表した相関行列を表示します。',
    },
    {
      title: 'サンプル数と両側p値をペアごとに確認',
      text: '各ペアの相関係数に加えて、欠損値を除いたサンプル数と、t = r × √((n-2)/(1-r²)) を使った両側p値を表示します。',
    },
    {
      title: '強い正負のペアを一覧表示',
      text: '計算できたペアの中から、正の相関が強い上位3組と負の相関が強い上位3組を、相関係数・サンプル数・p値とともに確認できます。',
    },
    {
      title: '任意の2変数の散布図と回帰直線',
      text: 'X軸とY軸の変数を選ぶと、SVGの散布図と最小二乗回帰直線を表示します。入力内容はサーバーへ送信せず、ブラウザ内だけで処理します。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目をヘッダー、2〜8列を数値変数、各行を1サンプルとしてCSVを入力します。カンマ・タブ・セミコロン区切りに対応しています。',
    },
    {
      title: '行とセルを確認する',
      text: 'すべての変数が数値で揃った行が4行以上必要です。空欄や数値でないセルは欠損として扱い、各ペアの計算では両方の値が揃った行だけを使用します。',
    },
    {
      title: '行列・ペア・散布図を確認する',
      text: '相関行列の色と値、サンプル数、p値、強い正負のペアを確認し、散布図で選んだ2変数の関係と回帰直線を眺めます。',
    },
  ],
  faqs: [
    {
      q: '相関分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVはサーバーへ送信・保存されますか？',
      a: 'いいえ。計算とグラフの描画はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '相関があると因果関係があると言えますか？',
      a: 'いいえ。相関係数は2つの変数の直線的な関係の強さを示すもので、片方がもう片方の原因であることは示しません。第三の要因や偶然の影響も考えられるため、因果関係の判断には別の検証が必要です。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度でも入力しやすい縦並びのレイアウトを用意し、相関行列は横スクロール、散布図は画面幅に合わせて縮小されます。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/correlation-coefficient',
      label: '相関係数・散布図',
      description: '2変数の相関係数rと回帰直線を散布図で確認できます。',
    },
    {
      href: '/principal-component-analysis',
      label: '主成分分析',
      description: '複数の変数を少数の主成分にまとめて構造を確認できます。',
    },
    {
      href: '/multiple-regression',
      label: '重回帰分析',
      description: '複数の説明変数から目的変数を予測する回帰式を計算できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '相関分析｜相関行列・p値・散布図を無料計算',
  description:
    '2〜8個の数値変数を含むCSVから、ピアソンの相関行列、ペアごとのサンプル数と両側p値、強い正負のペア、散布図と回帰直線を計算。登録不要・計算はブラウザ内で完結します。',
  keywords: [
    '相関分析',
    '相関行列',
    'ピアソン 相関係数',
    'p値 計算',
    '散布図 作成',
    '相関 ヒートマップ',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/correlation-analysis',
  },
  openGraph: {
    title: '相関分析｜相関行列・p値・散布図を無料計算',
    description:
      '2〜8個の数値変数から相関行列、サンプル数、両側p値、強い正負のペア、散布図と回帰直線を計算できる無料ツールです。',
    url: `${APP_URL}/correlation-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '相関分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '相関分析｜相関行列・p値・散布図を無料計算',
    description:
      '2〜8個の数値変数から相関行列、サンプル数、両側p値、強い正負のペア、散布図と回帰直線を確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CorrelationAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <CorrelationAnalysis />
    </UtilityToolShell>
  );
}
