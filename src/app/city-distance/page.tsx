import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CityDistance } from '@/components/tools/city-distance/CityDistance';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/city-distance',
  name: '主要都市間距離計算',
  h1: '主要都市間距離計算：都市間の直線距離と方角を確認',
  description:
    '全国の主要都市から出発地と目的地を選び、地球を球体とみなした大円距離（直線距離）と方角の目安を計算する無料ツールです。緯度経度を簡易マップ上に示し、都市間の位置関係もブラウザ内で確認できます。',
  category: '地図 / 距離',
  features: [
    {
      title: '2つの都市を検索して選択',
      text: '出発地と目的地それぞれの検索欄で都市名や都道府県名を絞り込み、ドロップダウンから選択できます。',
    },
    {
      title: '大円距離をkmとmで表示',
      text: 'ハバーサイン式で2地点間の最短距離を計算し、キロメートルとメートルの両方で表示します。',
    },
    {
      title: '16方位で方角の目安を表示',
      text: '出発地から目的地への初期方位を計算し、北・北東・南西などの16方位と角度の目安で示します。',
    },
    {
      title: '簡易マップで位置関係を確認',
      text: '全国の都市を緯度経度に基づいて配置し、選択した2都市を強調表示して直線で結びます。',
    },
  ],
  steps: [
    {
      title: '出発地と目的地を選ぶ',
      text: '検索欄に都市名または都道府県名を入力して候補を絞り、それぞれのドロップダウンから都市を選択します。',
    },
    {
      title: '距離と方位を確認する',
      text: '直線距離がkmとmで表示され、方角は16方位と角度の目安で示されます。必要に応じて入れ替えボタンで出発地と目的地を交換できます。',
    },
    {
      title: '簡易マップと注意事項を確認する',
      text: 'マップ上で2都市の位置と直線を確認します。表示される距離は直線距離であり、実際の道路距離や鉄道距離とは異なります。',
    },
  ],
  faqs: [
    {
      q: '主要都市間距離計算は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '選んだ都市や検索内容は保存・送信されますか？',
      a: 'いいえ。都市の選択や距離の計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると選択内容は破棄されます。',
    },
    {
      q: '表示される距離は実際の移動距離ですか？',
      a: 'いいえ。表示されるのは緯度経度から計算した大円距離（直線距離）です。実際の道路距離・鉄道距離には経路の曲がりや地形の影響があるため、移動時間や運賃の検討には各交通機関の案内をご確認ください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも操作しやすい縦並びのレイアウトを用意しています。簡易マップは画面幅に合わせて拡大縮小され、PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/coordinate-distance',
      label: '座標距離計算',
      description: '緯度経度を入力して2地点間の距離を計算',
    },
    {
      href: '/world-timezone',
      label: '世界の時差計算',
      description: '世界の主要都市の時刻と時差を確認',
    },
    {
      href: '/prefecture-ranking',
      label: '都道府県統計ランキング',
      description: '人口・面積・人口密度を比較',
    },
  ],
};

export const metadata: Metadata = {
  title: '主要都市間距離計算｜都市間の直線距離・方角を無料計算',
  description:
    '全国の主要都市から出発地と目的地を選び、ハバーサイン式による直線距離をkmとmで計算。16方位の方角と簡易マップで位置関係も確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '都市間 距離 計算',
    '直線距離 計算',
    '2地点 距離',
    '16方位 計算',
    '日本 都市 距離',
    '簡易マップ',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/city-distance',
  },
  openGraph: {
    title: '主要都市間距離計算｜都市間の直線距離と方角を無料計算',
    description:
      '全国の主要都市から出発地と目的地を選び、直線距離をkmとmで計算。16方位の方角と簡易マップで位置関係も確認できます。',
    url: `${APP_URL}/city-distance`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '主要都市間距離計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '主要都市間距離計算｜都市間の直線距離と方角を無料計算',
    description:
      '全国の主要都市から出発地と目的地を選び、直線距離をkmとmで計算。16方位の方角と簡易マップで位置関係も確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CityDistancePage() {
  return (
    <UtilityToolShell seo={seo}>
      <CityDistance />
    </UtilityToolShell>
  );
}
