import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { BooleanAnalysis } from '@/components/tools/boolean-analysis/BooleanAnalysis';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/boolean-analysis',
  name: 'ブール代数分析（QCA）',
  h1: 'ブール代数分析（QCA）：真理表と最小十分条件を求める',
  description:
    '0/1の結果と2〜5個の0/1条件を含むCSVから真理表を作成し、整合性・被覆度、必要条件、最小十分条件をブラウザ内で計算します。QCAの結果は探索的な目安として確認してください。',
  category: '統計 / 質的比較',
  features: [
    {
      title: '真理表を自動で作成',
      text: 'ケースごとの条件パターンと結果をまとめ、パターンごとの件数、結果1の件数、整合性、被覆度を一覧で表示します。',
    },
    {
      title: '整合性と被覆度を計算',
      text: '最小化した十分条件の解について、結果に対する整合性と被覆度を計算します。各条件の存在・非存在について必要条件の整合性と被覆度も確認できます。',
    },
    {
      title: '最小十分条件を導出',
      text: '2〜5個の条件を対象に、整合性閾値を満たす真理表の行からQuine-McCluskey方式の最小化を行い、A*B + ~Cのような論理式で表示します。',
    },
    {
      title: '入力はブラウザ内で完結',
      text: '登録やログインは不要です。貼り付けたCSVはサーバーへ送信せず、localStorageなどにも保存しません。ページを閉じると破棄されます。',
    },
  ],
  steps: [
    {
      title: 'CSVを貼り付ける',
      text: '1行目をヘッダー、1列目をケース名、2列目を0/1の結果、3列目以降を2〜5個の0/1条件にしたCSVを入力します。カンマ、タブ、セミコロンに対応しています。',
    },
    {
      title: '整合性閾値を決める',
      text: '真理表の行を十分条件として採用する基準を0〜1で指定します。初期値は0.8です。閾値を変えると真理表の判定と最小化式が自動で更新されます。',
    },
    {
      title: '結果と限界を確認する',
      text: 'ケース数、真理表、解の整合性・被覆度、各条件の必要性、最小十分条件を確認します。結果は探索的なもので、条件の較正や真理表の決定に敏感です。',
    },
  ],
  faqs: [
    {
      q: 'ブール代数分析（QCA）は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力したCSVデータは保存されたり送信されたりしますか？',
      a: 'いいえ。CSVの解析と計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '整合性と被覆度はどう違いますか？',
      a: '整合性は、条件の組み合わせが結果1とどの程度一致しているかを示します。被覆度は、結果1のケースのうちその組み合わせがどの程度説明しているかを示します。必要条件では、条件が結果1のケースをどの程度包含するかと、条件を持つケースのうち結果1がどの程度かを確認します。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも横にはみ出さないよう、縦並びのレイアウトと折り返し可能な真理表・結果表示を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/cluster-analysis',
      label: 'クラスター分析',
      description: 'データの類似性からグループを見つける分析ツールです。',
    },
    {
      href: '/logistic-regression',
      label: 'ロジスティック回帰分析',
      description: '0/1の結果と予測変数の関係を係数とオッズ比で確認できます。',
    },
    {
      href: '/correlation-analysis',
      label: '相関分析',
      description: '変数間の関連の強さと向きを確認できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: 'ブール代数分析（QCA）｜真理表と最小十分条件を無料計算',
  description:
    '0/1の結果と2〜5個の0/1条件を含むCSVから、真理表・整合性・被覆度・必要条件・最小十分条件を計算。登録不要・入力はブラウザ内で完結します。',
  keywords: [
    'QCA',
    '質的比較分析',
    'ブール代数分析',
    '真理表 計算',
    '整合性 被覆度',
    '必要条件 分析',
    '統計 ツール',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/boolean-analysis',
  },
  openGraph: {
    title: 'ブール代数分析（QCA）｜真理表と最小十分条件を無料計算',
    description:
      '0/1の結果と2〜5個の0/1条件を含むCSVから真理表を作成し、整合性・被覆度・必要条件・最小十分条件をブラウザ内で計算します。',
    url: `${APP_URL}/boolean-analysis`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'ブール代数分析（QCA）',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ブール代数分析（QCA）｜真理表と最小十分条件を無料計算',
    description:
      '0/1の結果と2〜5個の0/1条件を含むCSVから、真理表・整合性・被覆度・必要条件・最小十分条件を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function BooleanAnalysisPage() {
  return (
    <UtilityToolShell seo={seo}>
      <BooleanAnalysis />
    </UtilityToolShell>
  );
}
