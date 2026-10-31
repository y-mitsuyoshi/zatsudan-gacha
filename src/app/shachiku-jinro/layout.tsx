import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜人狼 | AIと遊べる会社員人狼ゲーム',
  description: '会社を舞台にした無料の人狼ゲーム。スパイ、人事、総務、イエスマンなど個性豊かな役職とAIプレイヤーが入り乱れる、ひとりでも遊べる社畜系人狼。',
  keywords: ['社畜人狼', '人狼ゲーム', '無料ゲーム', 'ブラウザゲーム', 'AI人狼', '会社 人狼', 'パーティーゲーム'],
  alternates: {
    canonical: '/shachiku-jinro',
  },
  openGraph: {
    title: '社畜人狼 | AIと遊べる会社員人狼ゲーム',
    description: '会社を舞台にした無料の人狼ゲーム。個性豊かな役職とAIプレイヤーが入り乱れる、ひとりでも遊べる社畜系人狼。',
    url: '/shachiku-jinro',
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/ogp.png',
        width: 1200,
        height: 630,
        alt: '社畜人狼 - 雑談テーマガチャ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '社畜人狼 | AIと遊べる会社員人狼ゲーム',
    description: '会社を舞台にした無料の人狼ゲーム。個性豊かな役職とAIプレイヤーが入り乱れる、ひとりでも遊べる社畜系人狼。',
    images: ['/ogp.png'],
    creator: '@zatsudan_gacha',
  },
  robots: {
    index: true,
    follow: true,
  },
  category: 'entertainment',
};

export default function ShachikuJinroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
