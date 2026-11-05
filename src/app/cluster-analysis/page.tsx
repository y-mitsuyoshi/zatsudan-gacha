import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { ClusterAnalysis } from '@/components/tools/cluster-analysis/ClusterAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/cluster-analysis',
  name: 'クラスター分析',
  h1: 'クラスター分析（k-means）｜CSVのデータをクラスターに分けて散布図と中心を確認',
  description:
    'CSVに貼り付けた2〜6変数のデータをk-meansでクラスタリングし、各クラスターの中心・サイズ・慣性と2次元散布図を確認できる無料ツールです。標準化の切り替え、k=2〜6の比較、シルエットスコアの表示に対応し、計算はブラウザ内で完結します。',
  category: '統計 / 多変量解析',
  features: [
    {
      title: 'k-meansでクラスターに分割',
      text: '2〜6変数の数値データを、指定したクラスタ数kに基づいてk-meansで分割します。10回の再スタートを行い、クラスター内慣性が最も小さい解を採用します。',
    },
    {
      title: '中心・サイズ・慣性を確認',
      text: '各クラスターの中心（平均）、所属サンプル数、クラスター内慣性、慣性の合計、総慣性を表示。標準化時は中心を元の単位に戻して確認できます。',
    },
    {
      title: '標準化とkの比較',
      text: '尺度の異なる変数は標準化（zスコア）を有効にして分析できます。k=2〜6を切り替え、シルエットスコアや慣性を見ながらクラスタ数を検討できます。',
    },
    {
      title: '2次元散布図で可視化',
      text: '1列目と2列目の変数を使った散布図に、クラスターごとの色と中心を表示します。スマートフォンでも結果を縦並びで確認できます。',
    },
  ],
  steps: [
    {
      title: 'CSVデータを貼り付ける',
      text: '1行目にヘッダー、2行目以降に2〜6列の数値を入力します。カンマ・タブ・セミコロン区切りに対応し、8行以上の完全なデータが必要です。',
    },
    {
      title: 'クラスタ数kと標準化を選ぶ',
      text: 'k=2〜6からクラスタ数を選び、変数の尺度が異なる場合は標準化を有効にします。設定を変えると結果は自動で更新されます。',
    },
    {
      title: '結果と散布図を確認する',
      text: 'クラスター中心、サイズ、クラスター内慣性、総慣性、シルエットスコアを確認し、散布図で分かれ方を確認します。k-meansは初期値により結果が変わることがあります。',
    },
  ],
  faqs: [
    {
      q: 'クラスター分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータは保存されたり送信されたりしますか？',
      a: 'いいえ。計算とグラフの描画はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'クラスタ数kはどうやって選べばよいですか？',
      a: 'k=2〜6を順に試し、シルエットスコアが高いか、クラスター内慣性が大きく減るか、結果を解釈しやすいかを確認します。シルエットスコアは0.5以上で比較的まとまった構造の目安ですが、データの性質や目的に応じて判断してください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトを用意し、結果・クラスター中心・散布図を確認できます。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/principal-component-analysis',
      label: '主成分分析',
      description: '複数の変数を少数の主成分にまとめて傾向を確認',
    },
    {
      href: '/factor-analysis',
      label: '因子分析',
      description: '観測変数の背後にある共通因子を推定',
    },
    {
      href: '/heatmap-maker',
      label: 'ヒートマップメーカー',
      description: 'CSVの数値を色の濃淡で可視化して傾向を確認',
    },
  ],
};

export const metadata: Metadata = {
  title: 'クラスター分析（k-means）｜CSVからクラスターと散布図を無料計算',
  description:
    'CSVの2〜6変数データをk-meansでクラスタリング。クラスター中心・サイズ・慣性・シルエットスコアと2次元散布図を無料で確認できます。標準化とk=2〜6の切り替えに対応。登録不要・ブラウザ内計算。',
  keywords: [
    'クラスター分析',
    'k-means',
    'k平均法',
    'クラスタリング',
    'シルエットスコア',
    '多変量解析',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/cluster-analysis',
  },
  openGraph: {
    title: 'クラスター分析（k-means）｜CSVからクラスターと散布図を無料計算',
    description:
      'CSVの2〜6変数データをk-meansでクラスタリング。クラスター中心・サイズ・慣性、シルエットスコア、2次元散布図をブラウザ内で確認できます。',
    url: `${APP_URL}/cluster-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'クラスター分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'クラスター分析（k-means）｜CSVからクラスターと散布図を無料計算',
    description:
      'CSVの2〜6変数データをk-meansでクラスタリング。クラスター中心・サイズ・慣性、シルエットスコア、2次元散布図を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function ClusterAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <ClusterAnalysis />
    </UtilityToolShell>
  );
}
