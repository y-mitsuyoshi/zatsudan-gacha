import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Providers } from "./providers";
import { DomainRedirect } from "@/components/DomainRedirect";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-noto-sans-jp' });

export const metadata: Metadata = {
  metadataBase: new URL("https://zatsudan-gacha.app"),
  title: "雑談テーマガチャ",
  description: "リモートでも、雑談でつながろう。",
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
    description: "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ。",
    url: "https://zatsudan-gacha.app/",
    siteName: "雑談テーマガチャ",
    images: [
      {
        url: "https://zatsudan-gacha.app/ogp.png",
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
    description: "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ。",
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
      <head>
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7296906013994885"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} ${notoSansJp.variable} font-sans`}>
        <DomainRedirect />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
