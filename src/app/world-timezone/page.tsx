import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { WorldTimezone } from '@/components/tools/world-timezone/WorldTimezone';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/world-timezone',
  name: '世界時差クロック',
  h1: '世界時差クロック｜主要都市の現在時刻と時差をひと目で確認',
  description:
    '世界の主要都市の現在時刻と時差を、選んだ基準都市と比較して確認できる無料ツールです。各都市の日付、UTCオフセット、昼夜の目安を一覧表示し、時刻は30秒ごとに更新します。',
  category: '地図 / 時差',
  features: [
    {
      title: '主要都市の現在時刻と日付を一覧表示',
      text: '世界の主要都市について、その都市のタイムゾーンにおける現在時刻と日付を一覧で確認できます。',
    },
    {
      title: '基準都市との時差をひと目で比較',
      text: '東京やロンドンなどから基準都市を選ぶと、各都市との時差を時間と分で表示します。地域ごとにまとめて並べています。',
    },
    {
      title: '24時間の昼夜バーで昼と夜を確認',
      text: '各都市の24時間を表すバーで、6時から18時までの昼と、それ以外の夜を色分けします。現在時刻の位置と昼夜のラベルも表示します。',
    },
    {
      title: '夏時間を自動反映しブラウザ内で完結',
      text: '夏時間はブラウザのタイムゾーンデータベースに従って自動反映されます。入力内容の送信や保存はなく、すべてブラウザ内で動作します。',
    },
  ],
  steps: [
    {
      title: '基準にする都市を選ぶ',
      text: '「基準にする都市」の選択欄から、時差を比較したい都市を選びます。初期値は東京です。',
    },
    {
      title: '都市ごとの時刻と時差を確認する',
      text: '基準都市の現在時刻と日付を確認し、下の一覧で各都市の現地時刻、UTCオフセット、基準都市との時差を見比べます。',
    },
    {
      title: '昼夜と夏時間の表示を確認する',
      text: '各都市の24時間バーで昼か夜かを確認します。夏時間はブラウザのタイムゾーンデータベースに従って自動反映されます。',
    },
  ],
  faqs: [
    {
      q: '世界時差クロックは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。課金や回数制限もありません。',
    },
    {
      q: '選択した都市や閲覧内容は保存・送信されますか？',
      a: 'いいえ。都市の選択と時刻の計算はすべてお使いのブラウザ内で行われます。選択内容をサーバーへ送信したり、端末の保存領域に保存したりしません。ページを閉じると選択内容は破棄されます。',
    },
    {
      q: '夏時間（デイライトセービングタイム）は反映されますか？',
      a: 'はい。各都市の時刻とUTCオフセットは、ブラウザが持つタイムゾーンデータベースに従って計算するため、夏時間の切り替えも自動的に反映されます。ただし、ブラウザのデータが古い場合や制度変更直後は実際の時刻と異なることがあります。',
    },
    {
      q: 'スマートフォンでも使えますか？',
      a: 'はい。画面幅390px程度のスマートフォンでも時刻や時差が読みやすいよう、1列のレイアウトと折り返し可能な表示を用意しています。PCでも同じように利用できます。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/city-distance',
      label: '都市間距離計算',
      description: '世界の都市間のおおよその距離を大円距離で計算',
    },
    {
      href: '/coordinate-distance',
      label: '緯度経度距離計算',
      description: '2地点の緯度経度から距離と方位の目安を計算',
    },
    {
      href: '/prefecture-ranking',
      label: '都道府県ランキング',
      description: '人口・面積・人口密度などを都道府県別に比較',
    },
  ],
};

export const metadata: Metadata = {
  title: '世界時差クロック｜主要都市の現在時刻と時差を無料確認',
  description:
    '世界の主要都市の現在時刻・日付・UTCオフセット・基準都市との時差を一覧表示。24時間の昼夜バーと夏時間の自動反映に対応した無料の世界時差クロックです。登録不要・ブラウザ内で動作。',
  keywords: [
    '世界時差',
    '時差 計算',
    '世界時計',
    '現在時刻 世界',
    'UTC オフセット',
    'タイムゾーン',
    '夏時間 時差',
    '無料 ツール',
  ],
  alternates: {
    canonical: '/world-timezone',
  },
  openGraph: {
    title: '世界時差クロック｜主要都市の現在時刻と時差を無料確認',
    description:
      '世界の主要都市の現在時刻と時差を、選んだ基準都市と比較して確認。日付・UTCオフセット・24時間の昼夜バーも一覧表示します。',
    url: `${APP_URL}/world-timezone`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '世界時差クロック',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '世界時差クロック｜主要都市の現在時刻と時差を無料確認',
    description:
      '世界の主要都市の現在時刻と時差を、選んだ基準都市と比較して確認。日付・UTCオフセット・昼夜バーも一覧表示します。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function WorldTimezonePage() {
  return (
    <UtilityToolShell seo={seo}>
      <WorldTimezone />
    </UtilityToolShell>
  );
}
