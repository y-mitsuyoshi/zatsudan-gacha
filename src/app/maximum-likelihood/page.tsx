import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { MaximumLikelihood } from '@/components/tools/maximum-likelihood/MaximumLikelihood';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/maximum-likelihood',
  name: '最尤推定',
  h1: '最尤推定｜正規・指数・ポアソン分布のパラメータと信頼区間を計算',
  description:
    '数値データから正規分布・指数分布・ポアソン分布の最尤推定を行い、パラメータ、対数尤度、AIC、BIC、95%信頼区間を確認できる無料ツールです。入力はブラウザ内で完結し、登録は不要です。',
  category: '統計 / 推定',
  features: [
    {
      title: '3つの分布の最尤推定量を計算',
      text: '正規分布の平均と標準偏差、指数分布のrate λ、ポアソン分布のλを、入力した観測値から閉形式の最尤推定量として計算します。',
    },
    {
      title: '対数尤度・AIC・BICを表示',
      text: '推定した分布の対数尤度に加え、モデル選択の目安となるAICとBICを表示。パラメータ数とデータ数もあわせて確認できます。',
    },
    {
      title: '標準誤差と95%信頼区間',
      text: '大標本の正規近似による標準誤差と95%信頼区間をパラメータごとに表示します。推定値のばらつきの目安として利用できます。',
    },
    {
      title: 'ヒストグラムに推定分布を重ね描き',
      text: '観測値のヒストグラムと、推定した確率密度または確率を重ねて表示。データの形と仮定した分布の当てはまりを視覚的に確認できます。',
    },
  ],
  steps: [
    {
      title: '観測値と分布を選ぶ',
      text: 'カンマ・スペース・改行で区切った観測値を入力し、正規分布・指数分布・ポアソン分布から仮定する分布を選びます。分布ごとのサンプルデータも利用できます。',
    },
    {
      title: '推定パラメータを確認する',
      text: '最尤推定されたパラメータ、標準誤差、95%信頼区間を確認します。あわせて対数尤度、AIC、BIC、データ数も表示されます。',
    },
    {
      title: 'ヒストグラムと当てはまりを確認する',
      text: '観測値の分布に推定した確率密度または確率が重なっているかを確認します。結果は目安なので、分布の仮定が妥当かもあわせて検討してください。',
    },
  ],
  faqs: [
    {
      q: '最尤推定は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した観測値は保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '最尤推定と最小二乗法はどう違いますか？',
      a: '最小二乗法は残差の二乗和を小さくするようにパラメータを決める方法で、誤差が正規分布に従い分散が一定と仮定できる場合に最尤推定と一致します。最尤推定は仮定した確率分布のもとで観測データが得られる確率（尤度）を最大にするパラメータを選ぶ、より一般的な枠組みです。',
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
      href: '/logistic-regression',
      label: 'ロジスティック回帰',
      description: '目的変数の確率を推定する回帰分析を実行',
    },
    {
      href: '/t-test',
      label: 't検定',
      description: '2つのグループの平均値の差を統計的に検定',
    },
    {
      href: '/time-series-analysis',
      label: '時系列分析',
      description: '時系列データの推移と自己相関を確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '最尤推定｜正規・指数・ポアソン分布のパラメータを無料計算',
  description:
    '数値データから正規分布・指数分布・ポアソン分布の最尤推定を行い、パラメータ、対数尤度、AIC、BIC、標準誤差、95%信頼区間を計算。ヒストグラムに推定分布を重ねて確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '最尤推定',
    'MLE 計算',
    '正規分布 最尤推定',
    '指数分布 最尤推定',
    'ポアソン分布 最尤推定',
    'AIC BIC 計算',
    '信頼区間 計算',
    '統計 推定 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/maximum-likelihood',
  },
  openGraph: {
    title: '最尤推定｜正規・指数・ポアソン分布のパラメータを無料計算',
    description:
      '数値データから正規分布・指数分布・ポアソン分布の最尤推定を行い、パラメータ、対数尤度、AIC、BIC、95%信頼区間を確認できます。',
    url: `${APP_URL}/maximum-likelihood`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '最尤推定',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '最尤推定｜正規・指数・ポアソン分布のパラメータを無料計算',
    description:
      '数値データから正規分布・指数分布・ポアソン分布の最尤推定を行い、パラメータ、対数尤度、AIC、BIC、95%信頼区間を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function MaximumLikelihoodPage() {
  return (
    <UtilityToolShell seo={seo}>
      <MaximumLikelihood />
    </UtilityToolShell>
  );
}
