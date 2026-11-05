import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { MultipleRegression } from '@/components/tools/multiple-regression/MultipleRegression';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/multiple-regression',
  name: '重回帰分析',
  h1: '重回帰分析：CSVから回帰係数・信頼区間・VIF・残差を計算',
  description:
    'CSVを貼り付けるだけで、目的変数と2〜8個の説明変数から重回帰モデルを推定し、回帰係数、標準誤差、t値、p値、95%信頼区間、R²、調整済みR²、VIF、残差プロットを確認できる無料ツールです。計算はすべてブラウザ内で完結します。',
  category: '統計 / 回帰',
  features: [
    {
      title: 'CSVを貼り付けるだけで分析',
      text: '1行目をヘッダー、1列目を目的変数、続く2〜8列を説明変数として読み取ります。列数や行数、数値以外の値はその場で確認できます。',
    },
    {
      title: '係数と95%信頼区間を一覧表示',
      text: '切片を含む各回帰係数について、標準誤差、t値、p値、95%信頼区間を表で確認できます。信頼区間はt分布の自由度に基づいて計算します。',
    },
    {
      title: 'モデルの当てはまりを確認',
      text: 'R²、自由度調整済みR²、残差標準誤差、サンプル数を表示します。推定された重回帰式も係数からそのまま確認できます。',
    },
    {
      title: 'VIFと残差プロットで診断',
      text: '各説明変数のVIF（分散膨張係数）と、予測値に対する残差の散布図を表示します。多重共線性や残差の偏りの確認に役立ちます。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目にヘッダーを置き、1列目に目的変数、2〜8列目に説明変数を数値で入力します。カンマ・タブ・セミコロン区切りに対応しています。',
    },
    {
      title: '入力内容を確認する',
      text: 'ヘッダーの重複や空欄、列数・行数の不一致、数値以外の値がないかを確認します。サンプル数は説明変数の数+1より多く必要です。',
    },
    {
      title: '結果を確認する',
      text: '回帰係数と信頼区間、R²、調整済みR²、残差標準誤差、VIF、残差プロット、推定された回帰式を確認します。結果は目安として解釈してください。',
    },
  ],
  faqs: [
    {
      q: '重回帰分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータは保存されたり送信されたりしますか？',
      a: 'いいえ。解析はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '回帰係数はどのように解釈すればよいですか？',
      a: '回帰係数は、他の説明変数を一定に保ったときに、その説明変数が1単位増えた場合の目的変数の平均的な変化量を表します。p値が小さいほど統計的に有意な関連が示唆されますが、因果関係を証明するものではありません。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトを用意しています。係数表は横にスクロールでき、残差プロットは画面幅に合わせて縮小されます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/logistic-regression',
      label: 'ロジスティック回帰分析',
      description: '二値の目的変数に対する回帰分析を確認できます。',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '変数どうしの相関関係を確認できます。',
    },
    {
      href: '/anova',
      label: '分散分析（ANOVA）',
      description: 'グループ間の平均値の差を統計的に確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '重回帰分析｜回帰係数・信頼区間・VIFを無料計算',
  description:
    'CSVの目的変数と2〜8個の説明変数から重回帰モデルを推定。回帰係数、標準誤差、t値、p値、95%信頼区間、R²、調整済みR²、VIF、残差プロットを無料で確認できます。登録不要・計算はブラウザ内で完結。',
  keywords: [
    '重回帰分析',
    '回帰係数 計算',
    'VIF 計算',
    '決定係数 計算',
    '残差プロット',
    '95%信頼区間',
    '統計 回帰 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/multiple-regression',
  },
  openGraph: {
    title: '重回帰分析｜回帰係数・信頼区間・VIFを無料計算',
    description:
      'CSVから重回帰モデルを推定し、回帰係数、p値、95%信頼区間、R²、調整済みR²、VIF、残差プロットをブラウザ内で計算できます。',
    url: `${APP_URL}/multiple-regression`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '重回帰分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '重回帰分析｜回帰係数・信頼区間・VIFを無料計算',
    description:
      'CSVの目的変数と説明変数から重回帰モデルを推定。回帰係数、p値、95%信頼区間、R²、VIF、残差プロットを無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function MultipleRegressionPage() {
  return (
    <UtilityToolShell seo={seo}>
      <MultipleRegression />
    </UtilityToolShell>
  );
}
