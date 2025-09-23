import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import { DomainRedirect } from "@/components/DomainRedirect";
import { Footer } from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-noto-sans-jp' });

export const metadata: Metadata = {
  metadataBase: new URL("https://zatsudan-gacha.app"),
  title: "雑談テーマガチャ",
  description: "会議のアイスブレイクやリモートワーク中の雑談に困ったら「雑談テーマガチャ」！ボタン一つで面白いお題をランダムに提案し、会話のきっかけを作ります。",
  keywords: [
    '雑談',
    '雑談テーマ',
    '雑談ネタ',
    'テーマ',
    'ガチャ',
    'テーマガチャ',
    'アイスブレイク',
    'ネタ',
    '話題',
    '会話のネタ',
    '会議のアイスブレイク',
    'オンライン会議',
    'リモートワーク',
    'リモートワーク支援',
    'チームビルディング',
    'チーム交流',
    'コミュニケーション促進',
    'ワークショップ',
    'ブレイクアウト',
    '自己紹介ネタ',
    '社内イベント',
    '雑談ジェネレーター',
    '会話アイデア',
    'パーティーゲーム',
    'アイデア出し',
    'ウォームアップ',
    'ローカル利用',
    'オフライン対応',
    'オフラインモード',
    'オフラインでも使える',
    '教育',
    '研修',
    'チームミーティング',
    '交流ツール',
    '社内コミュニケーション',
  ],
  verification: {
    google: "",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/favicon.png',
      },
    ],
  },
  openGraph: {
    title: "雑談テーマガチャ",
    description: "会議のアイスブレイクやリモートワーク中の雑談に困ったら「雑談テーマガチャ」！ボタン一つで面白いお題をランダムに提案し、会話のきっかけを作ります。",
    url: "https://zatsudan-gacha.web.app/",
    siteName: "雑談テーマガチャ",
    images: [
      {
        url: "https://zatsudan-gacha.web.app/ogp.png",
        width: 512,
        height: 512,
        alt: "雑談テーマガチャ",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "雑談テーマガチャ",
    description: "会議のアイスブレイクやリモートワーク中の雑談に困ったら「雑談テーマガチャ」！ボタン一つで面白いお題をランダムに提案し、会話のきっかけを作ります。",
    images: ["https://zatsudan-gacha.web.app/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansJp.variable} font-sans`}>
        <DomainRedirect />
        <Providers>
          {children}
          <Footer />
        </Providers>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7296906013994885"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
