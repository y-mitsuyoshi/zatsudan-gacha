import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { FactorAnalysis } from '@/components/tools/factor-analysis/FactorAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/factor-analysis',
  name: '因子分析',
  h1: '因子分析｜CSVから因子負荷量・共通性・寄与率を計算',
  description:
    '3〜10個の数値変数を含むCSVから相関行列を計算し、主成分抽出とバリマックス回転による因子分析を行う無料ツールです。因子負荷量、共通性、独自性、固有値、寄与率をブラウザ内で確認できます。',
  category: '統計 / 多変量解析',
  features: [
    {
      title: 'CSVを貼り付けるだけで分析',
      text: '1行目に3〜10個の変数名、2行目以降にサンプルの数値を入力するだけで、標準化から相関行列の計算まで自動で行います。',
    },
    {
      title: 'バリマックス回転で解釈しやすく',
      text: '主成分抽出で得た因子負荷量に直交バリマックス回転を適用し、どの変数がどの因子に強く関連するかを読み取りやすくします。',
    },
    {
      title: '負荷量・共通性・寄与率を表で確認',
      text: '回転後の因子負荷量、各変数の共通性と独自性、相関行列の固有値、寄与率、累積寄与率を小数第2位までの表で確認できます。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、localStorageなどにも保存しません。',
    },
  ],
  steps: [
    {
      title: 'CSVデータを貼り付ける',
      text: '1行目に3〜10個の変数名、2行目以降に数値を入力します。カンマ・タブ・セミコロン区切りに対応し、10行以上の完全なデータが必要です。',
    },
    {
      title: '抽出する因子数を選ぶ',
      text: '1〜4因子の範囲で選択します。変数数を上限として、因子数が多いほど多くの分散を説明できます。',
    },
    {
      title: '結果と注意事項を確認する',
      text: '因子負荷量、共通性、独自性、固有値、寄与率を確認します。結果は主成分抽出とバリマックス回転による目安であり、最尤法による因子分析ではありません。',
    },
  ],
  faqs: [
    {
      q: '因子分析は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVは保存されたり送信されたりしますか？',
      a: 'いいえ。計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '因子負荷量はどう解釈すればよいですか？',
      a: '因子負荷量は、各変数と抽出された因子との関連の強さを表します。絶対値が大きいほどその因子との関連が強く、一般的には0.4以上を目安に解釈することがありますが、明確な基準ではありません。変数の意味や理論、他の分析結果とあわせて総合的に判断してください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすいよう、縦並びのレイアウトを用意しています。表が横に長い場合は表内でスクロールできます。',
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
      description: '変数の情報を少数の主成分に要約',
    },
    {
      href: '/cluster-analysis',
      label: 'クラスター分析',
      description: '似たサンプルをグループに分類',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '変数間の関連の強さを確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '因子分析｜因子負荷量・共通性・寄与率を無料計算',
  description:
    '3〜10個の数値変数を含むCSVから因子分析を実行。主成分抽出とバリマックス回転による因子負荷量、共通性、独自性、固有値、累積寄与率を無料で確認できます。登録不要・ブラウザ内計算。',
  keywords: [
    '因子分析',
    '因子負荷量',
    'バリマックス回転',
    '共通性',
    '固有値',
    '寄与率',
    '統計 計算 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/factor-analysis',
  },
  openGraph: {
    title: '因子分析｜因子負荷量・共通性・寄与率を無料計算',
    description:
      '3〜10個の数値変数を含むCSVから因子分析を実行。主成分抽出とバリマックス回転で因子負荷量、共通性、固有値、寄与率を確認できます。',
    url: `${APP_URL}/factor-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '因子分析',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '因子分析｜因子負荷量・共通性・寄与率を無料計算',
    description:
      '3〜10個の数値変数を含むCSVから因子分析を実行。主成分抽出とバリマックス回転で因子負荷量、共通性、固有値、寄与率を確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function FactorAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <FactorAnalysis />
    </UtilityToolShell>
  );
}
