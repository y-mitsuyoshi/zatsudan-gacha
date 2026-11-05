import type { Metadata } from 'next';
import { UtilityToolShell, type UtilityToolSeo } from '@/components/tools/UtilityToolShell';
import { UnitConverter } from '@/components/tools/unit-converter/UnitConverter';

const APP_URL = 'https://zatsudan-gacha.app';

const seo: UtilityToolSeo = {
  slug: '/unit-converter',
  name: '単位変換ツール',
  h1: '単位変換ツール',
  description:
    '長さ・重さ・温度・面積・体積・速度・データ容量の7カテゴリに対応した無料の単位変換ツールです。数値を入力して変換元と変換先の単位を選ぶだけで、ブラウザ上で即時に換算します。',
  category: '計算 / 単位変換',
  features: [
    {
      title: '7カテゴリをひとつの画面で換算',
      text: '長さ、重さ、温度、面積、体積、速度、データ容量を収録。買い物の下調べから学習、仕事の確認まで幅広く使えます。',
    },
    {
      title: '入力と同時に結果が更新',
      text: '数値を入力すると換算結果がすぐに表示されます。変換元と変換先の入れ替え、結果のコピー、入力のクリアにも対応しています。',
    },
    {
      title: '温度は5種類の単位に対応',
      text: '摂氏・華氏・ケルビンに加えて、ランキンとレオミュールも換算できます。絶対零度を下回る値には注意メッセージを表示します。',
    },
    {
      title: '入力データはブラウザ内で完結',
      text: '入力した数値や換算結果をサーバーへ送信しません。会員登録も不要で、スマートフォンのブラウザからそのまま利用できます。',
    },
  ],
  steps: [
    {
      title: 'カテゴリを選ぶ',
      text: '換算したい単位の種類を選びます。長さ、重さ、温度、面積、体積、速度、データ容量の7カテゴリから選択できます。',
    },
    {
      title: '数値と単位を指定する',
      text: '数値を入力し、変換元と変換先の単位を選びます。方向を逆にしたいときは入れ替えボタンを使います。',
    },
    {
      title: '結果を確認してコピーする',
      text: '表示された換算結果を確認し、必要に応じてコピーボタンで単位付きの値をクリップボードへ保存します。',
    },
  ],
  faqs: [
    {
      q: '単位変換ツールは無料で使えますか？',
      a: 'はい。登録やログインは不要で、すべて無料で利用できます。利用回数の制限もありません。',
    },
    {
      q: '入力した数値はサーバーに送信されますか？',
      a: 'いいえ。換算処理はすべてお使いのブラウザ内で完結し、入力値や結果をサーバーへ送信したり、ブラウザの保存領域に記録したりしません。ページを閉じると入力内容は破棄されます。',
    },
    {
      q: '換算結果の精度はどのくらいですか？',
      a: 'メートル法の定義値や国際ヤード・ポンドの換算係数など、広く用いられている値を使って計算しています。表示は読みやすさを優先して丸めているため、厳密な計算が必要な場合は表示桁数と丸め誤差にご注意ください。',
    },
    {
      q: '温度の変換はどのように計算していますか？',
      a: '摂氏・華氏・ケルビン・ランキン・レオミュールの関係式を用いて換算します。絶対零度（摂氏 -273.15度、華氏 -459.67度、ケルビン0）を下回る値は物理的に存在しないため、その場合は注意メッセージを表示します。',
    },
  ],
  related: [
    {
      href: '/tools',
      label: '無料ツール一覧',
      description: '登録不要で使える便利ツールをまとめて確認',
    },
    {
      href: '/bmi-calculator',
      label: 'BMI・健康計算',
      description: '身長と体重からBMIと標準体重を計算',
    },
    {
      href: '/loan-calculator',
      label: 'ローン計算ツール',
      description: '毎月の返済額と総返済額の目安を計算',
    },
    {
      href: '/character-counter',
      label: '文字数カウント',
      description: '文章の文字数や単語数をその場で確認',
    },
  ],
};

export const metadata: Metadata = {
  title: '単位変換ツール｜長さ・重さ・温度・データ容量を無料換算',
  description:
    '長さ、重さ、温度、面積、体積、速度、データ容量をブラウザ上で換算できる無料ツールです。数値を入力して単位を選ぶだけ。摂氏・華氏・ケルビンなどの温度変換にも対応し、登録不要で利用できます。',
  keywords: [
    '単位変換',
    '単位換算',
    '長さ 変換',
    '重さ 変換',
    '温度 変換',
    'データ容量 変換',
    '無料 計算ツール',
  ],
  alternates: {
    canonical: '/unit-converter',
  },
  openGraph: {
    title: '単位変換ツール｜長さ・重さ・温度・データ容量を無料換算',
    description:
      '長さ、重さ、温度、面積、体積、速度、データ容量に対応した無料の単位変換ツール。入力内容はブラウザ内で処理されます。',
    url: `${APP_URL}/unit-converter`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: '単位変換ツール',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '単位変換ツール｜長さ・重さ・温度・データ容量を無料換算',
    description:
      '長さ、重さ、温度、面積、体積、速度、データ容量をブラウザ上でかんたん換算。登録不要の無料ツールです。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function UnitConverterPage() {
  return (
    <UtilityToolShell seo={seo}>
      <UnitConverter />
    </UtilityToolShell>
  );
}
