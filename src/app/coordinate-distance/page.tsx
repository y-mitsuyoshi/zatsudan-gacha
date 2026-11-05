import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { CoordinateDistance } from '@/components/tools/coordinate-distance/CoordinateDistance';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/coordinate-distance',
  name: '緯度経度距離・方位計算',
  h1: '緯度経度距離・方位計算：2地点の距離・初期方位・中点を算出',
  description:
    '2地点の緯度と経度を入力すると、ハバーサイン式による地球表面の近似距離をkmとmで計算し、初期方位・16方位・中点の緯度経度を表示する無料ツールです。座標は正距円筒図法の簡易グリッドに示し、すべてブラウザ内で計算します。',
  category: '地図 / 測量',
  features: [
    {
      title: '緯度経度から距離を計算',
      text: '地点Aと地点Bの緯度・経度を入力するだけで、ハバーサイン式による2地点間の近似距離をキロメートルとメートルで表示します。',
    },
    {
      title: '初期方位と16方位を表示',
      text: '地点Aから地点Bへ向かう初期方位を度数で計算し、北・北北東・北東などの日本語16方位に丸めて示します。',
    },
    {
      title: '中点の緯度・経度を算出',
      text: '2地点を結ぶ大円上の中点を求め、北緯・南緯、東経・西経の形式で緯度と経度を確認できます。',
    },
    {
      title: '簡易グリッドで位置関係を確認',
      text: '正距円筒図法の座標グリッド上に地点A・地点B・中点と2点を結ぶ線を描き、位置関係を視覚的に把握できます。',
    },
  ],
  steps: [
    {
      title: '地点Aと地点Bの座標を入力する',
      text: '地点Aと地点Bそれぞれの緯度（-90〜90°）と経度（-180〜180°）を入力します。入力すると距離・方位・中点が自動で更新されます。',
    },
    {
      title: '距離・方位・中点を確認する',
      text: '2地点間の距離がkmとmで、初期方位が度数と16方位で表示されます。中点の緯度経度と座標グリッド上の位置も確認できます。',
    },
    {
      title: '入れ替えやリセットを活用する',
      text: '出発地と目的地を入れ替えたいときは入れ替えボタンを使います。例の座標を入力したり、リセットで初期値に戻したりできます。',
    },
  ],
  faqs: [
    {
      q: '緯度経度距離・方位計算は無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '入力した緯度・経度は保存されたり送信されたりしますか？',
      a: 'いいえ。距離・方位・中点の計算はすべてお使いのブラウザ内で行われ、入力内容をサーバーへ送信したり、localStorageなどに保存したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '表示される距離や方位はどのくらい正確ですか？',
      a: '地球を半径約6,371kmの球体とみなすハバーサイン式による近似計算です。測地系の違い、標高、地形、地球の楕円体としての扁平は反映しません。航海・航空・測量・法的な境界の判断には使用せず、正確な値が必要な場合は専門機関の資料や測量結果をご確認ください。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも入力しやすい縦並びのレイアウトを用意しています。座標グリッドは画面幅に合わせて拡大縮小され、PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利なWebツールをまとめて確認できます。',
    },
    {
      href: '/city-distance',
      label: '主要都市間距離計算',
      description: '主要都市を選んで直線距離と方角を計算',
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
  title: '緯度経度距離・方位計算｜2地点の距離・初期方位・中点を無料計算',
  description:
    '2地点の緯度と経度からハバーサイン式による近似距離をkmとmで計算。初期方位・日本語16方位・中点の緯度経度を無料で確認できます。登録不要・入力はブラウザ内で完結。',
  keywords: [
    '緯度経度 距離 計算',
    '2地点 距離 計算',
    '方位 計算',
    '16方位 計算',
    '中点 緯度 経度',
    'ハバーサイン 距離',
    '座標 距離 計算',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/coordinate-distance',
  },
  openGraph: {
    title: '緯度経度距離・方位計算｜2地点の距離・初期方位を無料計算',
    description:
      '2地点の緯度と経度から近似距離をkmとmで計算。初期方位・16方位・中点の緯度経度もブラウザ内で確認できます。',
    url: `${APP_URL}/coordinate-distance`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '緯度経度距離・方位計算',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '緯度経度距離・方位計算｜2地点の距離・初期方位を無料計算',
    description:
      '2地点の緯度と経度から近似距離をkmとmで計算。初期方位・16方位・中点の緯度経度も無料で確認できます。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function CoordinateDistancePage() {
  return (
    <UtilityToolShell seo={seo}>
      <CoordinateDistance />
    </UtilityToolShell>
  );
}
