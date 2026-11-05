import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '究極の言い訳ジェネレーター',
  description: 'ピンチを切り抜ける最高の言い訳をAIが生成。遅刻、納期遅れ、飲み会の断りなど、あらゆるシーンに対応。10種類の文体、履歴保存、コピー・Xシェアにも対応した無料ツールです。',
  keywords: [
    '言い訳ジェネレーター',
    '言い訳 生成',
    '言い逃れ',
    'AI 文章生成',
    '遅刻 言い訳',
    '納期遅れ 言い訳',
    '飲み会 断り方',
    '無料 ツール',
  ],
  authors: [{ name: '雑談テーマガチャ運営チーム' }],
  creator: '雑談テーマガチャ',
  publisher: '雑談テーマガチャ',
  category: 'entertainment',
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/excuse-generator',
  },
  openGraph: {
    title: '究極の言い訳ジェネレーター',
    description: 'AIが必死に考える、最高の言い逃れ。',
    type: 'website',
    url: 'https://zatsudan-gacha.app/excuse-generator',
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    images: [
      {
        url: 'https://zatsudan-gacha.app/ogp.png', // 既存のOGP画像を流用
        width: 1200,
        height: 630,
        alt: '究極の言い訳ジェネレーター',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '究極の言い訳ジェネレーター',
    description: 'AIがあなたの代わりに謝ります。',
    images: ['https://zatsudan-gacha.app/ogp.png'],
    creator: '@zatsudan_gacha',
  },
};

export default function ExcuseGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
