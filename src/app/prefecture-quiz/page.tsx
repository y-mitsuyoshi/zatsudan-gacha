import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { PrefectureQuiz } from '@/components/tools/prefecture-quiz/PrefectureQuiz';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/prefecture-quiz',
  name: '都道府県統計クイズ',
  h1: '都道府県統計クイズ｜人口・面積・人口密度を5問で学ぶ',
  description:
    '都道府県の人口・面積・人口密度・地域区分からランダムに5問を出題する無料クイズです。4つの選択肢から正解を選ぶと、正誤と短い解説が表示され、最後にスコアを確認できます。',
  category: '統計 / クイズ',
  features: [
    {
      title: '統計データから5問をランダム出題',
      text: '人口の最多・最少、面積の最大・最小、人口密度の最高・最低、地域区分の問題を組み合わせて5問を出題します。',
    },
    {
      title: '4択で正誤と解説を確認',
      text: '各問題は4つの都道府県から正解を1つ選ぶ形式です。回答後は正誤と、実際の統計値にもとづく短い解説を表示します。',
    },
    {
      title: '進捗とスコアをその場で表示',
      text: '何問目か、現在の正解数、残りの問題数を確認しながら進められます。全5問を終えると最終スコアと成績に応じたメッセージを表示します。',
    },
    {
      title: 'スマートフォンでも遊びやすい設計',
      text: '選択肢は大きなタップ領域を確保し、画面幅の狭いスマートフォンでも縦に並べて操作できます。登録やログインは不要です。',
    },
  ],
  steps: [
    {
      title: 'クイズを開始する',
      text: '「クイズを開始する」を押すと、統計データからランダムに5問が生成されます。',
    },
    {
      title: '4つの選択肢から正解を選ぶ',
      text: '問題文を読み、都道府県名の選択肢を1つ選びます。回答すると正誤と短い解説が表示されます。',
    },
    {
      title: '最終スコアを確認して再挑戦する',
      text: '「次の問題へ」を押して全5問に回答します。最後に正解数と成績メッセージを確認し、必要なら「もう一度挑戦する」で新しい問題に挑戦できます。',
    },
  ],
  faqs: [
    {
      q: '都道府県統計クイズは無料で遊べますか？',
      a: 'はい。登録やログインは不要で、すべて無料で遊べます。課金や回数制限もありません。',
    },
    {
      q: '回答内容やスコアは保存・送信されますか？',
      a: 'いいえ。クイズの生成と採点はすべてお使いのブラウザ内で行われ、回答内容やスコアをサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると結果は破棄されます。',
    },
    {
      q: '出題される統計データの出典は何ですか？',
      a: '人口は2020年国勢調査、面積は国土地理院の公表値を参考にした概算です。人口密度は人口を面積で割って算出しています。最新の値は各自治体や統計機関の公表資料をご確認ください。',
    },
    {
      q: 'スマートフォンでも遊べますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも、選択肢を縦に並べてタップしやすく表示します。PCでも同じように遊べます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/prefecture-ranking',
      label: '都道府県ランキング',
      description: '人口・面積・人口密度などを都道府県別に比較',
    },
    {
      href: '/standard-deviation',
      label: '標準偏差計算',
      description: 'データのばらつきを標準偏差と分散で確認',
    },
    {
      href: '/city-distance',
      label: '都市間距離計算',
      description: '都市間のおおよその距離を大円距離で計算',
    },
  ],
};

export const metadata: Metadata = {
  title: '都道府県統計クイズ｜人口・面積・人口密度を5問で学ぶ無料クイズ',
  description:
    '都道府県の人口・面積・人口密度・地域区分からランダムに5問を出題。4択で正誤と短い解説を確認でき、最後にスコアを表示します。登録不要・スマホ対応の無料クイズです。',
  keywords: [
    '都道府県 クイズ',
    '都道府県 統計',
    '人口 クイズ',
    '面積 クイズ',
    '人口密度 クイズ',
    '地域区分 クイズ',
    '都道府県 ランキング',
    '無料 クイズ',
  ],
  alternates: {
    canonical: '/prefecture-quiz',
  },
  openGraph: {
    title: '都道府県統計クイズ｜人口・面積・人口密度を5問で学ぶ',
    description:
      '都道府県の人口・面積・人口密度・地域区分からランダムに5問を出題。4択で正誤と解説を確認し、最終スコアを競えます。',
    url: `${APP_URL}/prefecture-quiz`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '都道府県統計クイズ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '都道府県統計クイズ｜人口・面積・人口密度を5問で学ぶ',
    description:
      '都道府県の人口・面積・人口密度・地域区分からランダムに5問を出題。4択で正誤と解説を確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function PrefectureQuizPage() {
  return (
    <UtilityToolShell seo={seo}>
      <PrefectureQuiz />
    </UtilityToolShell>
  );
}
