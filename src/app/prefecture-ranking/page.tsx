import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { PrefectureRanking } from '@/components/tools/prefecture-ranking/PrefectureRanking';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/prefecture-ranking',
  name: '都道府県統計ランキング',
  h1: '都道府県統計ランキング：人口・面積・人口密度を比較',
  description:
    '47都道府県の人口・面積・人口密度を、地域やキーワードで絞り込みながらランキング形式で比較できる無料ツールです。上位10件の棒グラフと全47件の一覧表で、全国の規模感をブラウザ内だけで確認できます。',
  category: '統計 / ランキング',
  features: [
    {
      title: '人口・面積・人口密度で並び替え',
      text: '人口、面積、人口密度のいずれかを選ぶと、47都道府県を大きい順に並び替えます。順位は全国の中での位置として表示します。',
    },
    {
      title: '地域フィルターとキーワード検索',
      text: '北海道・東北・関東などの地域で絞り込めるほか、都道府県名や地域名の一部を入力して検索できます。条件は組み合わせて使えます。',
    },
    {
      title: '上位10件を棒グラフで比較',
      text: '表示中のデータから上位10件を選び、CSSの横棒グラフで値の大きさを比較できます。グラフの下には数値と単位も表示します。',
    },
    {
      title: '全47都道府県の一覧表',
      text: '順位・都道府県・地域・人口・面積・人口密度を表で確認できます。表はスマートフォンで横スクロールでき、ヘッダーは先頭に固定されます。',
    },
  ],
  steps: [
    {
      title: '並び替えの指標を選ぶ',
      text: '人口・面積・人口密度の中から、比較したい指標を選択します。初期表示は人口の大きい順です。',
    },
    {
      title: '地域やキーワードで絞り込む',
      text: '必要に応じて地域を選び、都道府県名や地域名を検索欄へ入力します。条件に一致したデータだけがグラフと表に反映されます。',
    },
    {
      title: '概要・グラフ・一覧表を確認する',
      text: '全国の総人口・総面積・最高密度・最低密度を確認し、上位10件の棒グラフと全47都道府県の表で詳しい数値を見比べます。',
    },
  ],
  faqs: [
    {
      q: '都道府県統計ランキングは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '検索した内容や表示内容は保存・送信されますか？',
      a: 'いいえ。並び替えや絞り込みの操作はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '人口・面積などのデータの出典は何ですか？',
      a: '人口は2020年国勢調査、面積は国土地理院の公表値を参考にした概算です。最新の値や詳細な定義は、総務省統計局や国土地理院、各自治体の公表資料をご確認ください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも操作しやすい縦並びのレイアウトを用意しています。一覧表は横スクロールでき、ヘッダーは表の先頭に固定されます。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/prefecture-quiz',
      label: '都道府県クイズ',
      description: '都道府県の位置や特色をクイズ形式で確認できます。',
    },
    {
      href: '/standard-deviation',
      label: '標準偏差計算',
      description: 'データの平均値や標準偏差を計算できます。',
    },
    {
      href: '/city-distance',
      label: '都市間距離計算',
      description: '都市間のおおよその距離を計算できます。',
    },
  ],
};

export const metadata: Metadata = {
  title: '都道府県統計ランキング｜人口・面積・人口密度を無料比較',
  description:
    '47都道府県の人口・面積・人口密度をランキング形式で比較。地域やキーワードで絞り込み、上位10件の棒グラフと全47件の一覧表を無料で確認できます。登録不要・操作はブラウザ内で完結。',
  keywords: [
    '都道府県 ランキング',
    '都道府県 人口 ランキング',
    '都道府県 面積 ランキング',
    '人口密度 ランキング',
    '都道府県 統計',
    '地域 絞り込み',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/prefecture-ranking',
  },
  openGraph: {
    title: '都道府県統計ランキング｜人口・面積・人口密度を無料比較',
    description:
      '47都道府県の人口・面積・人口密度をランキング形式で比較。地域やキーワードで絞り込み、上位10件の棒グラフと全47件の一覧表を確認できます。',
    url: `${APP_URL}/prefecture-ranking`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '都道府県統計ランキング',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '都道府県統計ランキング｜人口・面積・人口密度を無料比較',
    description:
      '47都道府県の人口・面積・人口密度をランキング形式で比較。地域やキーワードで絞り込み、上位10件の棒グラフと一覧表を無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function PrefectureRankingPage() {
  return (
    <UtilityToolShell seo={seo}>
      <PrefectureRanking />
    </UtilityToolShell>
  );
}
