import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { DeviationScore } from '@/components/tools/deviation-score/DeviationScore';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/deviation-score',
  name: '偏差値計算',
  h1: '偏差値計算｜得点・平均点・標準偏差から偏差値とパーセンタイルを計算',
  description:
    '得点と平均点、標準偏差から偏差値・zスコア・推定パーセンタイルを計算できる無料ツールです。得点をまとめて貼り付けて、平均点と母標準偏差から各得点の偏差値を求めることもできます。',
  category: '統計 / 計算',
  features: [
    {
      title: '1つの得点からすぐに計算',
      text: '得点・平均点・標準偏差を入力すると、偏差値、zスコア、正規分布を仮定した推定パーセンタイルを表示します。',
    },
    {
      title: '得点リストをまとめて分析',
      text: 'カンマ・スペース・改行で区切った得点リストから平均点と母標準偏差を計算し、各得点の偏差値を一覧で表示します。',
    },
    {
      title: '視覚的な偏差値スケール',
      text: '20から80を目安にしたスケール上に結果の位置を表示。偏差値がどのあたりにあるかを直感的に確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力した得点や平均点などはサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: '計算モードを選ぶ',
      text: '1つの得点を計算する場合は「単一の得点」、複数の得点をまとめて計算する場合は「得点リスト」を選びます。',
    },
    {
      title: '得点と必要な値を入力する',
      text: '単一モードでは得点・平均点・標準偏差を、得点リストモードでは得点をカンマ・スペース・改行で区切って入力します。',
    },
    {
      title: '偏差値とパーセンタイルを確認する',
      text: '偏差値、zスコア、正規分布を仮定した推定パーセンタイルを確認します。得点リストでは平均点と母標準偏差、各得点の結果も表示します。',
    },
  ],
  faqs: [
    {
      q: '偏差値計算は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した得点や平均点は保存・送信されますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '表示されるパーセンタイルはどのような意味ですか？',
      a: 'パーセンタイルは、得点分布が正規分布に従うと仮定して算出した近似値です。実際の分布が正規分布から外れている場合や標本が小さい場合は、実際の順位と異なることがあります。',
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
      href: '/standard-deviation',
      label: '標準偏差計算',
      description: 'データのばらつきを標準偏差で確認',
    },
    {
      href: '/correlation-coefficient',
      label: '相関係数計算',
      description: '2つのデータの関連性を数値で確認',
    },
    {
      href: '/statistics-graph',
      label: '統計グラフ作成',
      description: '入力したデータをグラフで可視化',
    },
  ],
};

export const metadata: Metadata = {
  title: '偏差値計算｜得点・平均点・標準偏差から偏差値とパーセンタイルを無料計算',
  description:
    '得点と平均点、標準偏差から偏差値・zスコア・推定パーセンタイルを無料で計算。得点リストを貼り付けて平均点と母標準偏差から各得点の偏差値を求めることもできます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '偏差値 計算',
    '偏差値 求め方',
    'zスコア 計算',
    'パーセンタイル 計算',
    '標準偏差 偏差値',
    '統計 計算 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/deviation-score',
  },
  openGraph: {
    title: '偏差値計算｜得点・平均点・標準偏差から偏差値を無料計算',
    description:
      '得点と平均点、標準偏差から偏差値・zスコア・推定パーセンタイルを計算。得点リストから平均点と母標準偏差を求めて各得点の偏差値も表示できます。',
    url: `${APP_URL}/deviation-score`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '偏差値計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '偏差値計算｜得点・平均点・標準偏差から偏差値を無料計算',
    description:
      '得点と平均点、標準偏差から偏差値・zスコア・推定パーセンタイルを無料で計算。得点リストから各得点の偏差値も求められます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function DeviationScorePage() {
  return (
    <UtilityToolShell seo={seo}>
      <DeviationScore />
    </UtilityToolShell>
  );
}
