import type { Metadata, Viewport } from "next";

import { Providers } from "./providers";
import { DomainRedirect } from "@/components/DomainRedirect";
import { AdSenseScript } from "@/components/AdSenseScript";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://zatsudan-gacha.app"),
  applicationName: "雑談テーマガチャ",
  title: {
    default: "雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選",
    template: "%s｜雑談テーマガチャ",
  },
  description: "会議のアイスブレイクやリモートワーク中の雑談に困ったら「雑談テーマガチャ」。25カテゴリ・700以上のお題から、ボタンひとつで会話のきっかけをランダム提案。履歴・お気に入り・タイムアタック・ルーレット・AI深掘り質問も無料で使えます。",
  keywords: [
    '雑談',
    '雑談テーマ',
    '雑談ネタ',
    '雑談お題',
    'お題',
    'お題ガチャ',
    'テーマ',
    'ガチャ',
    'テーマガチャ',
    'アイスブレイク',
    'アイスブレイク お題',
    'アイスブレイク 質問',
    '会議 雑談',
    '会議のアイスブレイク',
    'リモートワーク',
    'リモート 雑談',
    'オンライン会議',
    '1on1',
    '1on1 アイスブレイク',
    'チームビルディング',
    'チーム交流',
    'チームミーティング',
    'コミュニケーション促進',
    'ワークショップ',
    'ブレイクアウトルーム',
    '自己紹介ネタ',
    '社内イベント',
    '飲み会 話題',
    'パーティー 話題',
    '雑談ジェネレーター',
    '会話のネタ',
    '会話のきっかけ',
    '話題提供',
    '研修',
    '教育',
    '交流ツール',
    '社内コミュニケーション',
    'オフライン対応',
    '無料',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
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
    title: "雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選",
    description: "25カテゴリ・700以上のお題から、ボタンひとつで会話のきっかけをランダム提案。会議のアイスブレイク、1on1、リモートワークの雑談に。",
    url: "https://zatsudan-gacha.app/",
    siteName: "雑談テーマガチャ",
    locale: "ja_JP",
    images: [
      {
        url: "https://zatsudan-gacha.app/ogp.png",
        width: 1200,
        height: 630,
        alt: "雑談テーマガチャ - 会議のアイスブレイクに使えるお題アプリ",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "雑談テーマガチャ｜会議のアイスブレイクに使えるお題を無料で抽選",
    description: "25カテゴリ・700以上のお題から、ボタンひとつで会話のきっかけをランダム提案。会議のアイスブレイク、1on1、リモートワークの雑談に。",
    images: ["https://zatsudan-gacha.app/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="font-sans">
        <DomainRedirect />
        <Providers>
          {children}
          <Footer />
          <AdSenseScript />
        </Providers>
      </body>
    </html>
  );
}
