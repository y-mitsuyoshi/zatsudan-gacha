import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { TimeSeriesAnalysis } from '@/components/tools/time-series-analysis/TimeSeriesAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/time-series-analysis',
  name: '時系列分析',
  h1: '時系列分析｜移動平均・指数平滑・線形トレンド・自己相関を無料計算',
  description:
    '時間順の数値を貼り付けるだけで、移動平均、指数平滑、線形トレンド、最初の差分、自己相関（ACF）を計算できる無料ツールです。3期先までの予測と系列チャートをブラウザ内で表示します。',
  category: '統計 / 時系列',
  features: [
    {
      title: '移動平均と指数平滑を比較',
      text: '移動平均の期間は2〜12期、指数平滑のαは0.1〜0.9から選べます。実測値に重ねて表示し、平滑化の違いを確認できます。',
    },
    {
      title: '線形トレンドと3期先予測',
      text: '最小二乗法で傾きと切片を求め、指数平滑または線形トレンドによる3期先までの予測を表示します。',
    },
    {
      title: '最初の差分と自己相関を確認',
      text: '最初の差分の平均や直近の差分に加え、ラグ1〜12の自己相関（ACF）を計算し、棒グラフで周期性の手がかりを確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力した時系列データはサーバーへ送信せず、localStorageなどにも保存しません。',
    },
  ],
  steps: [
    {
      title: '時系列データを入力する',
      text: '数値をカンマ・スペース・改行で区切って8件以上入力します。各行の先頭に「第1週 42」のようなラベルを付けることもできます。',
    },
    {
      title: '移動平均の期間・α・予測方法を選ぶ',
      text: '移動平均の期間を2〜12期、指数平滑のαを0.1〜0.9から選び、3期先予測に指数平滑または線形トレンドを使うかを指定します。',
    },
    {
      title: 'チャートと要約を確認する',
      text: '実測値・移動平均・指数平滑・予測の折れ線、ACFの棒グラフ、要約統計表を見ながら系列の傾向を確認します。',
    },
  ],
  faqs: [
    {
      q: '時系列分析ツールは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した時系列データは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '移動平均と指数平滑の違いは何ですか？',
      a: '移動平均は直近の一定期間の値を同じ重みで平均するため、滑らかになりますが変化への反応は遅れます。指数平滑はαで決まる重みで新しい値ほど重視するため、αが大きいほど直近の変化に素早く反応します。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすいよう、縦並びのレイアウトとタップしやすい入力欄を用意しています。チャートは画面幅に合わせて拡大・縮小されます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/survival-analysis',
      label: '生存時間分析',
      description: 'イベントまでの時間データを分析',
    },
    {
      href: '/quantile-regression',
      label: '分位点回帰分析',
      description: '分位点ごとの回帰直線と切片・傾きを推定',
    },
    {
      href: '/statistics-graph',
      label: '統計グラフメーカー',
      description: 'ラベルと値から棒グラフ・折れ線グラフを作成',
    },
  ],
};

export const metadata: Metadata = {
  title: '時系列分析｜移動平均・指数平滑・トレンド・自己相関を無料計算',
  description:
    '時間順の数値から移動平均、指数平滑、線形トレンド、最初の差分、自己相関（ACF）を計算。3期先までの予測と系列チャートを無料で確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '時系列分析',
    '移動平均 計算',
    '指数平滑 計算',
    '自己相関 ACF',
    '線形トレンド 計算',
    '時系列 予測',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/time-series-analysis',
  },
  openGraph: {
    title: '時系列分析｜移動平均・指数平滑・自己相関を無料計算',
    description:
      '時間順の数値から移動平均、指数平滑、線形トレンド、自己相関を計算。3期先までの予測と系列チャートをブラウザ内で表示できます。',
    url: `${APP_URL}/time-series-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '時系列分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '時系列分析｜移動平均・指数平滑・自己相関を無料計算',
    description:
      '時間順の数値から移動平均、指数平滑、線形トレンド、自己相関を計算。3期先までの予測と系列チャートを無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function TimeSeriesAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <TimeSeriesAnalysis />
    </UtilityToolShell>
  );
}
