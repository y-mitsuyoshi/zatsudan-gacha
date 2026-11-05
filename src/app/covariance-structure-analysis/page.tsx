import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CovarianceStructureAnalysis } from '@/components/tools/covariance-structure-analysis/CovarianceStructureAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/covariance-structure-analysis',
  name: '共分散構造分析（媒介分析）',
  h1: '共分散構造分析（媒介分析）｜パス解析で間接効果とSobel検定を計算',
  description:
    'X・M・Yの3列CSVから、Mを介した間接効果とSobel検定、直接効果・総効果、媒介率、決定係数を計算する無料ツールです。パス図と3つの回帰モデルをブラウザ内で表示します。',
  category: '統計 / 因果モデル',
  features: [
    {
      title: '3つの回帰モデルを同時に推定',
      text: 'MをXに、YをXに、YをXとMに回帰し、媒介経路のa・b、直接効果c′、総効果cを最小二乗法で推定します。',
    },
    {
      title: 'Sobel検定と媒介率を表示',
      text: '間接効果a×bの標準誤差からSobel zとp値を計算。総効果が0に近くない場合は媒介率も確認できます。',
    },
    {
      title: 'パス図とモデル表で確認',
      text: 'XからMを経由してYへ向かう経路と、XからYへの直接経路をSVGで表示。係数・標準誤差・t値・p値・R²を表で確認できます。',
    },
    {
      title: 'CSVを貼り付けるだけ',
      text: 'ヘッダーx,m,yの3列を貼り付け、8行以上の完全なデータがあれば計算できます。入力内容はサーバーへ送信しません。',
    },
  ],
  steps: [
    {
      title: 'CSVデータを貼り付ける',
      text: '1行目にx,m,yのヘッダー、2行目以降に数値3列を入力します。カンマ・タブ・セミコロン区切りに対応し、8行以上の完全なデータが必要です。',
    },
    {
      title: '媒介効果と検定結果を確認する',
      text: 'MをXに回帰したa、YをXとMに回帰したbとc′、YをXに回帰したcを確認します。間接効果a×b、Sobel z・p値、媒介率、各モデルのR²も表示します。',
    },
    {
      title: 'パス図とモデル表を読む',
      text: 'パス図で経路と係数を確認し、モデル表で標準誤差・t値・p値を確認します。結果は観測変数による媒介分析として解釈してください。',
    },
  ],
  faqs: [
    {
      q: '共分散構造分析（媒介分析）は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '間接効果や媒介率はどう解釈すればよいですか？',
      a: '間接効果はa×b、媒介率は間接効果を総効果で割った値です。Sobel検定のp値が小さくても因果関係を証明するものではなく、時間的順序や未測定の交絡、モデルの線形性などの仮定を確認する必要があります。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度でも入力・結果・パス図・モデル表を縦並びで確認できるよう調整しています。表が横に長い場合は表内でスクロールできます。',
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
      href: '/multilevel-analysis',
      label: 'マルチレベル分析',
      description: '階層構造をもつデータを分析',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '変数間の関連の強さを確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '共分散構造分析（媒介分析）｜間接効果・Sobel検定・パス図を無料計算',
  description:
    'X・M・Yの3列CSVから媒介分析を実行。Mを介した間接効果a×b、Sobel検定のzとp値、直接効果・総効果、媒介率、各モデルのR²をパス図と表で確認できます。登録不要・ブラウザ内計算。',
  keywords: [
    '共分散構造分析',
    '媒介分析',
    '間接効果',
    'Sobel検定',
    'パス解析',
    '統計 計算 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/covariance-structure-analysis',
  },
  openGraph: {
    title: '共分散構造分析（媒介分析）｜間接効果・Sobel検定を無料計算',
    description:
      'X・M・YのCSVから媒介分析を実行。間接効果、Sobel検定、媒介率、R²をパス図とモデル表で確認できます。',
    url: `${APP_URL}/covariance-structure-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '共分散構造分析（媒介分析）',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '共分散構造分析（媒介分析）｜間接効果・Sobel検定を無料計算',
    description:
      'X・M・YのCSVから媒介分析を実行。間接効果、Sobel検定、媒介率、R²をパス図とモデル表で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CovarianceStructureAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <CovarianceStructureAnalysis />
    </UtilityToolShell>
  );
}
