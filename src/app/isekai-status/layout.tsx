import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '異世界転生ステータスカード | あなたの異世界での姿を診断',
  description: '5つの質問に答えて、あなたが異世界に転生した時のステータスカードを作成しよう！職業、能力値、固有スキルなど、あなただけの異世界キャラクターが完成します。画像ダウンロード機能付きで、SNSでのシェアも簡単。',
  keywords: [
    '異世界転生',
    'ステータスカード',
    'RPG',
    'キャラクター診断',
    '性格診断',
    'ファンタジー',
    '二つ名',
    '職業診断',
    'ゲーム',
    'エンターテイメント',
    '無料診断',
    'おもしろ診断',
    'SNSシェア',
    'ざつだんガチャ'
  ],
  authors: [{ name: 'ざつだんガチャ' }],
  creator: 'ざつだんガチャ',
  publisher: 'ざつだんガチャ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://zatsudan-gacha.web.app'),
  alternates: {
    canonical: '/isekai-status',
  },
  openGraph: {
    title: '異世界転生ステータスカード | あなたの異世界での姿を診断',
    description: '5つの質問に答えて、あなたが異世界に転生した時のステータスカードを作成しよう！職業、能力値、固有スキルなど、あなただけの異世界キャラクターが完成します。',
    url: 'https://zatsudan-gacha.web.app/isekai-status',
    siteName: 'ざつだんガチャ',
    images: [
      {
        url: '/ogp.png',
        width: 1200,
        height: 630,
        alt: '異世界転生ステータスカード - ざつだんガチャ',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '異世界転生ステータスカード | あなたの異世界での姿を診断',
    description: '5つの質問に答えて、あなたが異世界に転生した時のステータスカードを作成しよう！',
    images: ['/ogp.png'],
    creator: '@zatsudan_gacha',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // 実際のGoogle Search Console verification codeに置き換え
  },
  category: 'entertainment',
};

export default function IsekaiStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}