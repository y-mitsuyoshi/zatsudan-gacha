import type { Metadata } from 'next';

const pageTitle = '社畜すごろくNEO | 選択で変わるキャリアボードゲーム';
const pageDescription = 'サイコロで進む60マスのキャリアすごろく。10種の職業、選択イベント、評価ポイント、アイテム、実績を搭載。あなたの選択で結末が変わる無料ブラウザボードゲーム。';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: ['社畜すごろく', 'すごろく', 'ボードゲーム', 'キャリア診断', 'ブラウザゲーム', '無料ゲーム', '仕事 ゲーム', '選択ゲーム'],
  metadataBase: new URL('https://zatsudan-gacha.app'),
  alternates: {
    canonical: '/shachiku-sugoroku',
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/shachiku-sugoroku',
    siteName: '雑談テーマガチャ',
    images: [
      {
        url: '/shachiku-sugoroku-ogp.png',
        width: 1200,
        height: 630,
        alt: '社畜すごろくNEO - 雑談テーマガチャ',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: ['/shachiku-sugoroku-ogp.png'], // New OGP image for this page
    creator: '@zatsudan_gacha',
  },
  robots: {
    index: true,
    follow: true,
  },
  category: 'entertainment',
};

export default function ShachikuSugorokuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
