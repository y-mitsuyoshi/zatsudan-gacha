import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { LogisticRegression } from '@/components/tools/logistic-regression/LogisticRegression';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/logistic-regression',
  name: 'ロジスティック回帰分析',
  h1: 'ロジスティック回帰分析：CSVから係数・オッズ比・予測確率を計算',
  description:
    '0/1の結果と2〜6個の数値予測変数を含むCSVを貼り付けるだけで、ロジスティック回帰をブラウザ内で推定します。係数、標準誤差、オッズ比と95%信頼区間、McFaddenの疑似R²、正解率、混同行列を確認できます。',
  category: '統計 / 回帰',
  features: [
    {
      title: 'IRLSで係数と標準誤差を推定',
      text: '切片と予測変数を含むモデルを反復再重み付け最小二乗法（IRLS／ニュートン・ラフソン法）で推定し、係数、標準誤差、z値、正規近似のp値を表示します。',
    },
    {
      title: 'オッズ比と95%信頼区間',
      text: '各予測変数の係数を指数変換したオッズ比と、1.96×標準誤差を用いた95%信頼区間を表示します。結果変数に対する関連の向きと大きさの目安を確認できます。',
    },
    {
      title: 'モデルの当てはまりと予測を確認',
      text: '対数尤度、McFaddenの疑似R²、閾値0.5での正解率と2×2混同行列、各データの予測確率を表示します。予測確率は棒グラフで一覧できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、localStorageなどのブラウザ保存領域にも書き込みません。ページを閉じると破棄されます。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目をヘッダー、1列目を0/1の結果、2列目以降を2〜6個の数値予測変数にしたCSVを入力します。カンマ、タブ、セミコロンの区切りに対応しています。',
    },
    {
      title: '列と値を確認する',
      text: 'ヘッダーの重複や空欄、行ごとの列数、数値でない値、0/1以外の結果がないかを確認します。問題がある場合は入力欄の下にエラーが表示されます。',
    },
    {
      title: '推定結果と注意点を確認する',
      text: '係数、標準誤差、z値、p値、オッズ比、信頼区間、疑似R²、正解率、混同行列、予測確率を確認します。分離や非収束の警告が出た場合は結果を過信しないでください。',
    },
  ],
  faqs: [
    {
      q: 'ロジスティック回帰分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータはサーバーに送信されますか？',
      a: 'いいえ。CSVの解析とロジスティック回帰の計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'オッズ比はどう解釈すればよいですか？',
      a: 'オッズ比が1より大きい場合、その予測変数が1単位増えると結果が1になるオッズが増える方向、1より小さい場合は減る方向と解釈します。95%信頼区間に1が含まれる場合は、関連の向きが明確でない可能性があります。オッズ比は確率そのものではない点に注意してください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも横にはみ出さないよう、縦並びのレイアウトと折り返し可能な結果表示を用意しています。PCでも同じように利用できます。',
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
      description: '複数の予測変数から連続値の結果を予測する回帰分析です。',
    },
    {
      href: '/t-test',
      label: 't検定',
      description: '2つのグループの平均値に差があるかを検定できます。',
    },
    {
      href: '/maximum-likelihood',
      label: '最尤推定',
      description: '尤度関数からパラメータを推定する考え方を確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: 'ロジスティック回帰分析｜CSVからオッズ比・予測確率を無料計算',
  description:
    '0/1の結果と2〜6個の数値予測変数を含むCSVから、ロジスティック回帰の係数・標準誤差・オッズ比・95%信頼区間・McFaddenの疑似R²・正解率・混同行列を計算。登録不要・入力はブラウザ内で完結します。',
  keywords: [
    'ロジスティック回帰 計算',
    'ロジスティック回帰分析',
    'オッズ比 計算',
    'オッズ比 信頼区間',
    'McFadden 疑似R2',
    '混同行列 計算',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/logistic-regression',
  },
  openGraph: {
    title: 'ロジスティック回帰分析｜CSVからオッズ比・予測確率を無料計算',
    description:
      'CSVからロジスティック回帰を推定し、係数・標準誤差・オッズ比・95%信頼区間・疑似R²・正解率・混同行列を確認できる無料ツールです。',
    url: `${APP_URL}/logistic-regression`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'ロジスティック回帰分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ロジスティック回帰分析｜CSVからオッズ比・予測確率を無料計算',
    description:
      'CSVからロジスティック回帰を推定し、係数・オッズ比・信頼区間・疑似R²・正解率・混同行列を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function LogisticRegressionPage() {
  return (
    <UtilityToolShell seo={seo}>
      <LogisticRegression />
    </UtilityToolShell>
  );
}
