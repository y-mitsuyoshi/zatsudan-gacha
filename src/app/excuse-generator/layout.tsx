import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '究極の言い訳ジェネレーター | 雑談テーマガチャ',
  description: 'ピンチを切り抜ける最高の言い訳をAIが生成。遅刻、納期遅れ、飲み会の断りなど、あらゆるシーンに対応。',
  openGraph: {
    title: '究極の言い訳ジェネレーター | 雑談テーマガチャ',
    description: 'AIが必死に考える、最高の言い逃れ。',
    type: 'website',
    url: 'https://zatsudan-gacha.web.app/excuse-generator',
    images: [
      {
        url: 'https://zatsudan-gacha.web.app/ogp.png', // 既存のOGP画像を流用
        width: 1200,
        height: 630,
        alt: '究極の言い訳ジェネレーター',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '究極 of 言い訳ジェネレーター',
    description: 'AIがあなたの代わりに謝ります。',
  },
};

export default function ExcuseGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
