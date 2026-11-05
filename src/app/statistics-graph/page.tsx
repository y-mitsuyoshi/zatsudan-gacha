import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { StatisticsGraph } from '@/components/tools/statistics-graph/StatisticsGraph';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/statistics-graph',
  name: '統計グラフメーカー',
  h1: '統計グラフメーカー｜ラベルと値から棒グラフ・折れ線グラフを作成',
  description:
    'ラベルと値を1行ずつ入力するだけで、棒グラフや折れ線グラフをブラウザ内で作成できる無料ツールです。入力順・降順・昇順の並び替え、タイトルと単位の設定、最大12件のデータ表示に対応しています。',
  category: '統計 / グラフ',
  features: [
    {
      title: '棒グラフと折れ線グラフを切り替え',
      text: '同じデータを棒グラフと折れ線グラフで表示できます。値の大小を比べたいときは棒、変化の流れを見たいときは折れ線を選べます。',
    },
    {
      title: '並び替えで傾向をつかむ',
      text: '入力順のほか、値の大きい順・小さい順に並べ替えられます。最大12件までのデータを読みやすいグラフに整えます。',
    },
    {
      title: 'タイトルと単位を自由に設定',
      text: 'グラフに任意のタイトルを付け、縦軸の単位を指定できます。売上、気温、点数など、用途に合わせた表現にできます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力したデータはサーバーへ送信せず、ページを閉じると保持されません。',
    },
  ],
  steps: [
    {
      title: 'ラベルと値を入力する',
      text: '1行につき「ラベル,値」の形式で入力します。区切りはカンマ、タブ、全角カンマに対応し、最大12行まで処理します。',
    },
    {
      title: 'グラフの種類と並び順を選ぶ',
      text: '棒グラフまたは折れ線グラフを選び、入力順・降順・昇順から並び順を指定します。変更するとグラフはすぐに更新されます。',
    },
    {
      title: 'タイトルと単位を設定して確認する',
      text: '必要に応じてグラフのタイトルと単位を入力します。軸ラベル、目盛り、各値を見ながらグラフの傾向を確認できます。',
    },
  ],
  faqs: [
    {
      q: '統計グラフメーカーは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したデータは保存されたり送信されたりしますか？',
      a: 'いいえ。グラフの作成はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'データはどのような形式で入力すればよいですか？',
      a: '1行につき「ラベル,値」の形式で入力してください。区切りにはカンマ、タブ、全角カンマを使えます。値は数値で入力し、空欄や数値以外の文字が含まれる場合はエラーを表示します。データは最大12行までです。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすいよう、縦並びのレイアウトとタップしやすい入力欄を用意しています。グラフは画面幅に合わせて拡大・縮小されます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/heatmap-maker',
      label: 'ヒートマップメーカー',
      description: '数値データを色の濃淡でわかりやすく可視化',
    },
    {
      href: '/standard-deviation',
      label: '標準偏差・分散計算',
      description: '平均や標準偏差からデータのばらつきを確認',
    },
    {
      href: '/correlation-coefficient',
      label: '相関係数計算',
      description: '2つのデータの関係性を数値で確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '統計グラフメーカー｜ラベルと値から棒グラフ・折れ線グラフを無料作成',
  description:
    'ラベルと値を1行ずつ入力して、棒グラフや折れ線グラフを無料で作成。入力順・降順・昇順の並び替え、タイトルと単位の設定、最大12件のデータ表示に対応しています。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '統計 グラフ 作成',
    '棒グラフ 作成',
    '折れ線グラフ 作成',
    'グラフ メーカー',
    'データ 可視化',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/statistics-graph',
  },
  openGraph: {
    title: '統計グラフメーカー｜棒グラフ・折れ線グラフを無料作成',
    description:
      'ラベルと値を入力するだけで、棒グラフや折れ線グラフを作成。並び替え、タイトル、単位の設定にも対応し、入力内容はブラウザ内で処理します。',
    url: `${APP_URL}/statistics-graph`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '統計グラフメーカー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '統計グラフメーカー｜棒グラフ・折れ線グラフを無料作成',
    description:
      'ラベルと値を入力するだけで、棒グラフや折れ線グラフを作成。並び替え、タイトル、単位の設定にも対応しています。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function StatisticsGraphPage() {
  return (
    <UtilityToolShell seo={seo}>
      <StatisticsGraph />
    </UtilityToolShell>
  );
}
