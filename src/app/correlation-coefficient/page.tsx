import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CorrelationCoefficient } from '@/components/tools/correlation-coefficient/CorrelationCoefficient';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/correlation-coefficient',
  name: '相関係数・散布図',
  h1: '相関係数・散布図：XとYの関係を相関係数rと回帰直線で確認',
  description:
    'XとYの2つの数値データを入力すると、平均・標準偏差・共分散・ピアソンの相関係数r・決定係数R²・最小二乗回帰直線を計算し、散布図で関係を確認できる無料ツールです。計算はすべてブラウザ内で完結します。',
  category: '統計 / 分析',
  features: [
    {
      title: '相関係数rと決定係数R²を計算',
      text: 'ピアソンの相関係数rと、rを2乗した決定係数R²を小数第3位まで表示します。rは-1から1の範囲で、関係の強さと向きを確認できます。',
    },
    {
      title: '散布図と回帰直線を表示',
      text: '入力したデータを点でプロットし、最小二乗法による回帰直線を重ねて表示します。グラフは画面幅に合わせて拡大縮小されます。',
    },
    {
      title: '基本統計量もまとめて確認',
      text: 'データ数、XとYの平均、標本標準偏差、共分散、回帰直線の傾きと切片を計算します。標準偏差と共分散はn-1で割る標本の値です。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。入力したXとYのデータはサーバーへ送信せず、ブラウザ内の保存領域にも書き込みません。ページを閉じると破棄されます。',
    },
  ],
  steps: [
    {
      title: 'XとYの値を入力する',
      text: '2つのテキストエリアに数値を入力します。値はカンマ、スペース、改行のいずれかで区切ってください。サンプルデータを読み込むこともできます。',
    },
    {
      title: 'データ数をそろえる',
      text: 'XとYは同じ件数で、2組以上になるように入力します。件数が異なる場合や空欄がある場合はエラーメッセージを表示します。',
    },
    {
      title: '結果と散布図を確認する',
      text: '相関係数rの解釈、決定係数R²、基本統計量、回帰直線を確認し、散布図でデータの分布と直線的な関係を眺めます。',
    },
  ],
  faqs: [
    {
      q: '相関係数・散布図は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したXとYのデータはサーバーに送信されますか？',
      a: 'いいえ。計算とグラフの描画はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、ブラウザ内に保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '相関があると因果関係があると言えますか？',
      a: 'いいえ。相関係数は2つの変数の直線的な関係の強さを示すもので、片方がもう片方の原因であることは示しません。第三の要因や偶然の影響も考えられるため、因果関係の判断には別の検証が必要です。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトと、画面幅に合わせて縮小される散布図を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/standard-deviation',
      label: '標準偏差・分散計算',
      description: 'データのばらつきを標準偏差と分散で確認できます。',
    },
    {
      href: '/statistics-graph',
      label: '統計グラフ作成',
      description: '数値データからヒストグラムなどのグラフを作成できます。',
    },
    {
      href: '/heatmap-maker',
      label: 'ヒートマップ作成',
      description: '数値データを色の濃淡で可視化できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '相関係数・散布図｜相関係数rと回帰直線を無料計算',
  description:
    'XとYの2つの数値データから、平均・標準偏差・共分散・ピアソンの相関係数r・決定係数R²・最小二乗回帰直線を計算。散布図とrの解釈も無料で確認できます。登録不要・計算はブラウザ内で完結。',
  keywords: [
    '相関係数 計算',
    '散布図 作成',
    'ピアソン 相関係数',
    '決定係数 計算',
    '回帰直線 計算',
    '共分散 計算',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/correlation-coefficient',
  },
  openGraph: {
    title: '相関係数・散布図｜相関係数rと回帰直線を無料計算',
    description:
      'XとYの2つの数値データから相関係数r、決定係数R²、回帰直線を計算し、散布図で関係を確認できる無料ツールです。',
    url: `${APP_URL}/correlation-coefficient`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '相関係数・散布図',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '相関係数・散布図｜相関係数rと回帰直線を無料計算',
    description:
      'XとYの2つの数値データから相関係数r、決定係数R²、回帰直線を計算し、散布図で関係を確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CorrelationCoefficientPage() {
  return (
    <UtilityToolShell seo={seo}>
      <CorrelationCoefficient />
    </UtilityToolShell>
  );
}
