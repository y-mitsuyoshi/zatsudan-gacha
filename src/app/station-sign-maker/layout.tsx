import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '駅名標メーカー | オリジナル駅名看板を無料で作成',
  description: '駅名と路線カラーを入力するだけで、JR東日本風・メトロ風・シンプルな駅名標を無料で作成。画像としてダウンロードしてSNSでシェアできます。',
  keywords: ['駅名標', '駅名標メーカー', '駅名看板', '駅名 作成', '画像生成', 'SNSシェア', '無料ツール'],
  alternates: {
    canonical: '/station-sign-maker',
  },
  openGraph: {
    title: '駅名標メーカー | オリジナル駅名看板を無料で作成',
    description: '駅名と路線カラーを入力するだけで、JR東日本風・メトロ風・シンプルな駅名標を無料で作成。画像としてダウンロードしてSNSでシェアできます。',
    url: '/station-sign-maker',
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/ogp.png',
        width: 1200,
        height: 630,
        alt: '駅名標メーカー - 雑談テーマガチャ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '駅名標メーカー | オリジナル駅名看板を無料で作成',
    description: '駅名と路線カラーを入力するだけで、オリジナルの駅名標を無料で作成。画像としてダウンロードしてSNSでシェアできます。',
    images: ['/ogp.png'],
    creator: '@zatsudan_gacha',
  },
  robots: {
    index: true,
    follow: true,
  },
  category: 'entertainment',
};

export default function StationSignMakerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
