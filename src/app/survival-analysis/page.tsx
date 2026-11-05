import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { SurvivalAnalysis } from '@/components/tools/survival-analysis/SurvivalAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/survival-analysis',
  name: '生存分析（Kaplan-Meier）',
  h1: '生存分析（Kaplan-Meier）：CSVから生存曲線・中央生存時間・ログランク検定を計算',
  description:
    'time・event・group列を含むCSVを貼り付けるだけで、グループ別のKaplan-Meier生存曲線、時点ごとのリスク人数、中央生存時間をブラウザ内で計算します。2群の場合はログランク検定のχ²統計量とp値も確認できます。',
  category: '統計 / 生存時間',
  features: [
    {
      title: 'グループ別のKaplan-Meier曲線',
      text: 'timeとeventから各グループの生存率を推定し、階段状の生存曲線をSVGで表示します。最大4グループまで色分けして比較できます。',
    },
    {
      title: 'リスク人数と中央生存時間',
      text: 'イベント時点ごとのat risk（リスク人数）を表で確認でき、生存率が50%以下になる中央生存時間をグループごとに表示します。到達しない場合は「未到達」と表示します。',
    },
    {
      title: '2群のログランク検定',
      text: 'グループが2つの場合は、ログランク検定のχ²統計量とp値を計算します。3群以上の場合は生存曲線とグループ概要のみを表示します。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、localStorageなどのブラウザ保存領域にも書き込みません。ページを閉じると破棄されます。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目をヘッダーにして、time（正の数値）、event（1または0）、必要に応じてgroup（最大4グループ）の列を用意します。カンマ、タブ、セミコロンで区切れます。',
    },
    {
      title: '入力内容を確認する',
      text: 'timeが0より大きい数値か、eventが1（イベント）または0（打ち切り）か、groupが4種類以内かを確認します。問題がある場合は入力欄の下にエラーが表示されます。',
    },
    {
      title: '曲線と検定結果を確認する',
      text: 'グループ別の生存曲線、時点ごとのリスク人数、中央生存時間、2群の場合はログランク検定のχ²統計量とp値を確認します。',
    },
  ],
  faqs: [
    {
      q: '生存分析（Kaplan-Meier）は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータはサーバーに送信されますか？',
      a: 'いいえ。CSVの解析とKaplan-Meier推定はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '打ち切り（censored）はどう解釈すればよいですか？',
      a: 'eventが0の行は、その時点まで追跡できたがイベント発生は確認されなかった打ち切りです。Kaplan-Meier法では打ち切りをリスク集合から外して計算します。打ち切りが生存時間と無関係に生じる非情報的打ち切りを仮定しており、情報的打ち切りや競合リスクがある場合は推定が偏る可能性があります。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも横にはみ出さないよう、縦並びのレイアウトと折り返し可能なグラフ・表を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/time-series-analysis',
      label: '時系列分析',
      description: '時間順のデータから推移や自己相関を確認する分析ツールです。',
    },
    {
      href: '/t-test',
      label: 't検定',
      description: '2つのグループの平均値に差があるかを検定できます。',
    },
    {
      href: '/logistic-regression',
      label: 'ロジスティック回帰分析',
      description: '0/1の結果と予測変数から係数やオッズ比を推定できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '生存分析（Kaplan-Meier）｜生存曲線・中央生存時間・ログランク検定を無料計算',
  description:
    'time・event・group列を含むCSVから、グループ別のKaplan-Meier生存曲線、リスク人数、中央生存時間を計算。2群ではログランク検定のχ²統計量とp値も無料で確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '生存分析 計算',
    'Kaplan-Meier 生存曲線',
    'カプランマイヤー 計算',
    '中央生存時間 計算',
    'ログランク検定 計算',
    '打ち切り 生存分析',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/survival-analysis',
  },
  openGraph: {
    title: '生存分析（Kaplan-Meier）｜生存曲線・中央生存時間を無料計算',
    description:
      'CSVからグループ別のKaplan-Meier生存曲線、リスク人数、中央生存時間を計算。2群のログランク検定にも対応した無料ツールです。',
    url: `${APP_URL}/survival-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '生存分析（Kaplan-Meier）',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '生存分析（Kaplan-Meier）｜生存曲線・中央生存時間を無料計算',
    description:
      'CSVからKaplan-Meier生存曲線、リスク人数、中央生存時間、2群のログランク検定を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function SurvivalAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <SurvivalAnalysis />
    </UtilityToolShell>
  );
}
