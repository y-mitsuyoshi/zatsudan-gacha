import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { TTest } from '@/components/tools/t-test/TTest';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/t-test',
  name: 't検定',
  h1: 't検定：1標本・2標本・対応のある平均差をオンライン計算',
  description:
    '1標本・2標本（Student／Welch）・対応のあるt検定を、平均差・t値・自由度・両側p値・95%信頼区間・Cohen\'s dとあわせて計算できる無料ツールです。データはブラウザ内で処理され、登録なしで利用できます。',
  category: '統計 / 検定',
  features: [
    {
      title: '3種類のt検定に対応',
      text: '1標本、独立した2標本（Student・Welch）、対応のある2標本のt検定を切り替えて計算できます。',
    },
    {
      title: '検定結果をまとめて表示',
      text: '平均、標準偏差、サンプル数、平均差、t値、自由度、両側p値、95%信頼区間、Cohen\'s dを一度に確認できます。',
    },
    {
      title: 'StudentとWelchを選択',
      text: '2標本では等分散を仮定するStudentと、等分散を仮定しないWelchを選べます。用途に応じて分散の扱いを切り替えられます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力したデータはサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: '検定の種類を選ぶ',
      text: '1標本、2標本、対応ありから目的に合うt検定を選びます。2標本ではStudentかWelchも選択できます。',
    },
    {
      title: 'データを入力する',
      text: '数値をカンマ・スペース・改行で区切って入力します。1標本では帰無仮説の平均、対応ありでは同じ件数の2組を用意します。',
    },
    {
      title: '結果と前提を確認する',
      text: '平均差、t値、自由度、両側p値、95%信頼区間、Cohen\'s dを確認し、表示される計算式と前提もあわせて確認します。',
    },
  ],
  faqs: [
    {
      q: 't検定は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したデータは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'WelchとStudentはどう選べばよいですか？',
      a: '2群の母分散が等しいと考えられる場合はStudentを使います。等分散を仮定できない場合や、群のサンプルサイズ・ばらつきが異なる場合は、等分散を仮定しないWelchが一般に推奨されます。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトとタップしやすい入力欄を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/anova',
      label: '分散分析（ANOVA）',
      description: '3群以上の平均値の差を統計的に確認できます。',
    },
    {
      href: '/multiple-regression',
      label: '重回帰分析',
      description: '複数の説明変数から目的変数を予測する回帰分析を確認できます。',
    },
    {
      href: '/maximum-likelihood',
      label: '最尤推定',
      description: '最尤推定によるパラメータ推定の考え方を確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: 't検定｜1標本・2標本・対応のある検定を無料計算',
  description:
    't検定を1標本・2標本（Student／Welch）・対応のある2標本に対応。平均差、t値、自由度、両側p値、95%信頼区間、Cohen\'s dを無料で計算できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    't検定',
    't検定 計算',
    '1標本 t検定',
    '2標本 t検定',
    'Welch t検定',
    '対応のある t検定',
    'p値 計算',
    '統計 検定 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/t-test',
  },
  openGraph: {
    title: 't検定｜1標本・2標本・対応のある検定を無料計算',
    description:
      '1標本・2標本（Student／Welch）・対応のあるt検定を計算。平均差、t値、自由度、両側p値、95%信頼区間、Cohen\'s dをブラウザ内で確認できます。',
    url: `${APP_URL}/t-test`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 't検定',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 't検定｜1標本・2標本・対応のある検定を無料計算',
    description:
      '1標本・2標本（Student／Welch）・対応のあるt検定を計算。平均差、p値、95%信頼区間、効果量を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function TTestPage() {
  return (
    <UtilityToolShell seo={seo}>
      <TTest />
    </UtilityToolShell>
  );
}
