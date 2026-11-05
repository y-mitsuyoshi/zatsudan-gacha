import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { HeatmapMaker } from '@/components/tools/heatmap-maker/HeatmapMaker';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/heatmap-maker',
  name: 'ヒートマップメーカー',
  h1: 'ヒートマップメーカー：CSVの数値を色の濃淡で可視化し、行と列の傾向を確認',
  description:
    'CSV形式の数値データを貼り付けるだけで、行と列の値を色の濃淡で表すヒートマップを作成できる無料ツールです。行ラベルやヘッダーに対応し、青・赤・緑のカラースキームと、表全体または行ごとの正規化を選べます。',
  category: '統計 / 可視化',
  features: [
    {
      title: 'CSVを貼り付けるだけ',
      text: 'カンマ・タブ・セミコロン区切りの数値グリッドを貼り付けると、表の大小関係を色の濃淡で表示します。',
    },
    {
      title: 'ヘッダーと行ラベルに対応',
      text: '「,月,火,水」のようなヘッダー行と、「東京,10,20,30」のような行ラベルを自動で判定。列名と行名を付けたまま可視化できます。',
    },
    {
      title: '3色のカラースキーム',
      text: '青・赤・緑から色を選べます。セルには元の数値を表示し、背景色に合わせて読みやすい文字色を自動で選びます。',
    },
    {
      title: '表全体・行ごとの正規化',
      text: '表全体の最小値から最大値、または各行の最小値から最大値のどちらで色を割り当てるかを切り替えられます。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '左の入力欄にCSVを貼り付けます。1行目にヘッダー、1列目に行ラベルを置く場合は、先頭セルを空にするか列名を入れます。最大12行×12列までです。',
    },
    {
      title: 'ヘッダーと表示設定を選ぶ',
      text: '1行目の扱いを自動判定・ヘッダーあり・データ行から選び、カラースキームと正規化の単位を指定します。',
    },
    {
      title: '色分けされた表を確認する',
      text: 'セルに表示される数値と色の濃淡を見比べ、凡例の最小値・最大値を確認します。スマートフォンでは表を横にスクロールできます。',
    },
  ],
  faqs: [
    {
      q: 'ヒートマップメーカーは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータはサーバーに送信されたり保存されたりしますか？',
      a: 'いいえ。解析と表示はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: 'どのようなCSV形式に対応していますか？',
      a: 'カンマ・タブ・セミコロン区切りのCSVに対応しています。1行目にヘッダー、1列目に行ラベルを置けます。数値以外のセルや空欄がある場合はエラーを表示し、データ行は最大12行、数値列は最大12列まで処理します。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトを用意し、ヒートマップの表は横にスクロールして確認できます。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/statistics-graph',
      label: '統計グラフ作成',
      description: '数値データからグラフを作成して傾向を確認',
    },
    {
      href: '/correlation-coefficient',
      label: '相関係数・散布図',
      description: '2つの数値データの関係を相関係数と散布図で確認',
    },
    {
      href: '/prefecture-ranking',
      label: '都道府県ランキング',
      description: '都道府県別の統計データをランキングで比較',
    },
  ],
};

export const metadata: Metadata = {
  title: 'ヒートマップメーカー｜CSVの数値を色の濃淡で可視化',
  description:
    'CSV形式の数値データからヒートマップを無料で作成。行ラベルとヘッダーに対応し、青・赤・緑のカラースキーム、表全体または行ごとの正規化を選べます。登録不要・データはブラウザ内で処理。',
  keywords: [
    'ヒートマップ 作成',
    'ヒートマップ 無料',
    'CSV 可視化',
    '数値 可視化',
    '表 色分け',
    '統計 可視化 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/heatmap-maker',
  },
  openGraph: {
    title: 'ヒートマップメーカー｜CSVの数値を色の濃淡で可視化',
    description:
      'CSV形式の数値データを貼り付けるだけで、色の濃淡で表すヒートマップを作成。カラースキームと正規化を選べる無料ツールです。',
    url: `${APP_URL}/heatmap-maker`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'ヒートマップメーカー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ヒートマップメーカー｜CSVの数値を色の濃淡で可視化',
    description:
      'CSV形式の数値データからヒートマップを無料で作成。行ラベル・ヘッダー対応、青・赤・緑のカラースキームと正規化を選択できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function HeatmapMakerPage() {
  return (
    <UtilityToolShell seo={seo}>
      <HeatmapMaker />
    </UtilityToolShell>
  );
}
