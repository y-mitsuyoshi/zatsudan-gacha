import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { Anova } from '@/components/tools/anova/Anova';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/anova',
  name: '分散分析（ANOVA）',
  h1: '分散分析（一元配置ANOVA）：CSVから群間の平均値の差をF検定で確認',
  description:
    'group,value形式のCSVを貼り付けるだけで、一元配置分散分析のF値とp値、群間・群内の平方和、自由度、平均平方、η²、ω²を計算します。群ごとの平均と標準偏差、Welchのt検定による多重比較、平均値のエラーバー表示も確認できます。',
  category: '統計 / 検定',
  features: [
    {
      title: 'CSVから一元配置ANOVAを計算',
      text: '1行目をgroup,valueのヘッダーにし、各行を1つの観測値として読み取ります。群間・群内・全体の平方和と分散分析表を表示します。',
    },
    {
      title: '効果量と群ごとの要約を確認',
      text: 'F値とp値に加えて、η²とω²、各群の件数・平均値・標準偏差を一覧できます。平均値と標準偏差はエラーバー付きのグラフでも確認できます。',
    },
    {
      title: 'Welchのt検定で群を比較',
      text: '群の組み合わせごとにWelchのt検定を行い、Bonferroni法で調整したp値と5%水準での有意差の有無を表示します。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、localStorageなどにも保存しません。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: 'group,valueのヘッダーに続けて、群名と数値を1行1観測で入力します。カンマ区切りとタブ区切りに対応しています。',
    },
    {
      title: '群と件数を確認する',
      text: '群が2つ以上あり、各群に2件以上の観測値があることを確認します。群名の空欄や数値以外のvalueがある場合はエラーを表示します。',
    },
    {
      title: '結果と前提を確認する',
      text: '分散分析表、群ごとの平均と標準偏差、効果量、Welchのt検定による多重比較を確認します。独立性・正規性・等分散性の前提もあわせて確認してください。',
    },
  ],
  faqs: [
    {
      q: '分散分析（ANOVA）は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '貼り付けたCSVはサーバーに送信されたり保存されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'ANOVAとt検定はどう使い分けますか？',
      a: '2群の平均値だけを比較する場合はt検定が一般的です。3群以上を一度に比較する場合は、すべての群が同じ平均を持つという帰無仮説を検定する一元配置分散分析を使い、有意な差があればWelchのt検定などで群の組み合わせを確認します。何度も検定を繰り返す場合は多重比較の補正が必要です。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトと、横にはみ出しにくい表・グラフを用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/t-test',
      label: 't検定',
      description: '2群の平均値の差をWelchのt検定などで確認できます。',
    },
    {
      href: '/multiple-regression',
      label: '重回帰分析',
      description: '複数の予測変数から目的変数を説明する回帰分析を確認できます。',
    },
    {
      href: '/multilevel-analysis',
      label: 'マルチレベル分析',
      description: 'グループ構造を持つデータの分散成分やICCを確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '分散分析（ANOVA）｜群間の平均差とF値を無料計算',
  description:
    'group,value形式のCSVから一元配置分散分析を計算。群間・群内の平方和、自由度、平均平方、F値、p値、η²、ω²、群ごとの平均と標準偏差、Welchのt検定による多重比較を無料で確認できます。登録不要・計算はブラウザ内で完結。',
  keywords: [
    '分散分析',
    'ANOVA 計算',
    '一元配置分散分析',
    'F検定',
    'Welch t検定',
    'Bonferroni 補正',
    '効果量 η2 ω2',
    '統計 検定 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/anova',
  },
  openGraph: {
    title: '分散分析（ANOVA）｜群間の平均差とF値を無料計算',
    description:
      'CSVから一元配置分散分析を計算。F値、p値、平方和、効果量、群ごとの平均と標準偏差、Welchのt検定による多重比較をブラウザ内で確認できます。',
    url: `${APP_URL}/anova`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '分散分析（ANOVA）',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '分散分析（ANOVA）｜群間の平均差とF値を無料計算',
    description:
      'CSVから一元配置分散分析を計算。F値、p値、平方和、効果量、群ごとの平均と標準偏差、Welchのt検定による多重比較を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function AnovaPage() {
  return (
    <UtilityToolShell seo={seo}>
      <Anova />
    </UtilityToolShell>
  );
}
