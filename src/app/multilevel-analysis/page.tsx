import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { MultilevelAnalysis } from '@/components/tools/multilevel-analysis/MultilevelAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/multilevel-analysis',
  name: 'マルチレベル分析',
  h1: 'マルチレベル分析：グループ構造を持つデータのランダム切片モデルを近似推定',
  description:
    'グループ列と目的変数、1〜3個の予測変数を含むCSVを貼り付けると、ランダム切片モデルの固定効果、群間・群内分散、ICC、群ごとの縮小推定値を計算します。分散成分は一元配置の分散分析分解による近似で、すべてブラウザ内で処理します。',
  category: '統計 / マルチレベル',
  features: [
    {
      title: '固定効果と標準誤差を確認',
      text: '目的変数を予測変数で説明する固定効果をGLSで推定し、分散成分を固定した近似標準誤差とあわせて表示します。',
    },
    {
      title: '群間分散・群内分散・ICCを表示',
      text: '群ごとの残差を一元配置の分散分析で分解し、群間分散τ²、群内分散σ²、級内相関ICCを計算します。',
    },
    {
      title: '群ごとの縮小推定値を一覧',
      text: '各群のずれを縮小係数で調整した経験ベイズ的な群効果u_jと、群切片b0 + u_jを表で確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、ブラウザ内の保存領域にも書き込みません。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1列目をgroup、2列目をy、3列目以降を1〜3個の予測変数にしたCSVを入力します。カンマ区切りとタブ区切りに対応しています。',
    },
    {
      title: 'データ構造を確認する',
      text: 'グループが3つ以上あり、各グループに2件以上の行があることを確認します。数値でないセルや列数が合わない行がある場合はエラーを表示します。',
    },
    {
      title: '推定結果と前提を確認する',
      text: '固定効果、分散成分、ICC、群ごとの調整済み効果を確認します。結果は近似手法による探索的な参考値として扱ってください。',
    },
  ],
  faqs: [
    {
      q: 'マルチレベル分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '貼り付けたCSVはサーバーに送信されたり保存されたりしますか？',
      a: 'いいえ。解析はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'ICCはどのように解釈すればよいですか？',
      a: 'ICCは目的変数のばらつきのうち、群間の違いで説明できる割合の目安です。0に近いほど群による差が小さく、1に近いほど群間の差が大きいことを示します。ただし値の基準は研究分野やデータ構造によって異なり、このツールの推定は近似的です。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトと、横にはみ出しにくい結果表を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/multiple-regression',
      label: '重回帰分析',
      description: '複数の予測変数から目的変数を説明する回帰分析を確認できます。',
    },
    {
      href: '/anova',
      label: '分散分析',
      description: '群間の平均値の違いを分散分析で確認できます。',
    },
    {
      href: '/covariance-structure-analysis',
      label: '共分散構造分析',
      description: '観測変数と潜在変数の関係を共分散構造で確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: 'マルチレベル分析｜ランダム切片モデルを無料計算',
  description:
    'グループ構造を持つCSVから、ランダム切片モデルの固定効果、群間・群内分散、ICC、群ごとの縮小推定値を近似計算。登録不要・計算はブラウザ内で完結します。',
  keywords: [
    'マルチレベル分析',
    'ランダム切片モデル',
    '混合モデル 計算',
    'ICC 計算',
    '級内相関',
    '分散成分 推定',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/multilevel-analysis',
  },
  openGraph: {
    title: 'マルチレベル分析｜ランダム切片モデルを無料計算',
    description:
      'グループ構造を持つCSVから、ランダム切片モデルの固定効果、群間・群内分散、ICC、群ごとの縮小推定値を近似計算できます。',
    url: `${APP_URL}/multilevel-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'マルチレベル分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'マルチレベル分析｜ランダム切片モデルを無料計算',
    description:
      'グループ構造を持つCSVから、固定効果、群間・群内分散、ICC、群ごとの縮小推定値を近似計算できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function MultilevelAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <MultilevelAnalysis />
    </UtilityToolShell>
  );
}
