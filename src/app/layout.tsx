import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const notoSansJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-noto-sans-jp' });

export const metadata: Metadata = {
  title: "雑談テーマガチャ",
  description: "リモートでも、雑談でつながろう。",
  openGraph: {
    title: "雑談テーマガチャ",
    description: "会議のアイスブレイクや雑談のきっかけに！ランダムにお題を出すアプリ。",
    // TODO: デプロイ後に本番環境のURLに更新してください
    url: "https://zatsudan-gacha.vercel.app/",
    siteName: "雑談テーマガチャ",
    // TODO: アプリのOGP画像へのパスをここに追加してください
    // images: [
    //   {
    //     url: '/ogp.png', // 例: /ogp.png
    //     width: 1200,
    //     height: 630,
    //   },
    // ],
    type: 'website',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
