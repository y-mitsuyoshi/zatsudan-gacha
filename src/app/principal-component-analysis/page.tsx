import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { PrincipalComponentAnalysis } from '@/components/tools/principal-component-analysis/PrincipalComponentAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/principal-component-analysis',
  name: '主成分分析',
  h1: '主成分分析｜固有値・寄与率・負荷量とPC1/PC2散布図を無料計算',
  description:
    '2〜8個の数値変数を持つCSVから主成分分析を行い、固有値・寄与率・累積寄与率、負荷量、主成分得点を計算する無料ツールです。相関行列または共分散行列を選べ、PC1とPC2の散布図もブラウザ内で表示します。',
  category: '統計 / 多変量解析',
  features: [
    {
      title: '相関行列と共分散行列に対応',
      text: '変数を標準化した相関行列か、中心化した共分散行列を選んで主成分分析を実行できます。データの尺度が異なる場合は相関行列がおすすめです。',
    },
    {
      title: '固有値と寄与率を一覧表示',
      text: '各主成分の固有値、寄与率、累積寄与率を表で確認できます。どの主成分までを見ればデータ全体の分散をよく説明できるかの目安になります。',
    },
    {
      title: '第1〜3主成分の負荷量',
      text: '各変数が主成分にどの程度寄与しているかを負荷量として表示します。絶対値の大きい変数を手がかりに主成分の意味を解釈できます。',
    },
    {
      title: 'PC1とPC2の散布図をSVG表示',
      text: 'サンプルごとの主成分得点を第1主成分と第2主成分の2次元平面にプロットします。入力内容はサーバーへ送信せず、ブラウザ内で計算します。',
    },
  ],
  steps: [
    {
      title: 'CSVデータを貼り付ける',
      text: '1行目に2〜8個の変数名を持つヘッダー、2行目以降に数値を入力します。カンマ・タブ・セミコロン区切りに対応し、5行以上の完全なデータが必要です。',
    },
    {
      title: '相関行列か共分散行列を選ぶ',
      text: '変数を標準化して相関行列を使うか、中心化した共分散行列を使うかを選択します。選択内容は結果の表示にすぐ反映されます。',
    },
    {
      title: '固有値・負荷量・散布図を確認する',
      text: '固有値表で寄与率と累積寄与率を確認し、負荷量表で各変数の寄与の向きを読み取ります。PC1とPC2の散布図でサンプル間の位置関係も確認できます。',
    },
  ],
  faqs: [
    {
      q: '主成分分析ツールは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '負荷量はどう解釈すればよいですか？',
      a: '負荷量は固有ベクトルに固有値の平方根を掛けた値で、相関行列を使った場合は変数と主成分の相関に相当します。絶対値が大きい変数ほどその主成分の解釈に寄与します。主成分の正負の向きは計算上都合のよい向きに揃えているため、符号は相対的に解釈してください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度でも入力・結果・表・散布図を縦並びで確認できるよう調整しています。表が横に長い場合は表内でスクロールできます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/factor-analysis',
      label: '因子分析',
      description: '潜在因子から変数間の関係を整理',
    },
    {
      href: '/cluster-analysis',
      label: 'クラスター分析',
      description: '似たサンプルをグループに分類',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '変数間の関連の強さを確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '主成分分析｜固有値・寄与率・負荷量とPC1/PC2散布図を無料計算',
  description:
    '2〜8個の数値変数を持つCSVから主成分分析を実行。固有値、寄与率、累積寄与率、第1〜3主成分の負荷量、PC1とPC2の散布図を無料で確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '主成分分析',
    'PCA 計算',
    '固有値 計算',
    '寄与率 計算',
    '負荷量 主成分',
    '多変量解析 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/principal-component-analysis',
  },
  openGraph: {
    title: '主成分分析｜固有値・寄与率・負荷量を無料計算',
    description:
      '2〜8個の数値変数を持つCSVから主成分分析を実行。固有値、寄与率、累積寄与率、負荷量、PC1とPC2の散布図をブラウザ内で確認できます。',
    url: `${APP_URL}/principal-component-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '主成分分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '主成分分析｜固有値・寄与率・負荷量を無料計算',
    description:
      '2〜8個の数値変数を持つCSVから主成分分析を実行。固有値、寄与率、累積寄与率、負荷量、PC1とPC2の散布図を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function PrincipalComponentAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <PrincipalComponentAnalysis />
    </UtilityToolShell>
  );
}
