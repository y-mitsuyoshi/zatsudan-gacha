import type { Metadata } from 'next';

const pageTitle = '社畜すごろくNEO | あなたの社畜ランクを診断！面白いあるあるネタ満載の暇つぶしゲーム';
const pageDescription = '「退勤直前の"ちょっといい？"」など社会人の"あるある"が満載の爆笑すごろくゲーム。職業を選んでアイテムを駆使し、あなたの社畜ランクを診断しよう！実績コレクション機能も。完全無料で今すぐプレイ。';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  metadataBase: new URL('https://zatsudan-gacha.web.app'),
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
        url: '/shachiku-sugoroku-ogp.png', // New OGP image for this page
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
