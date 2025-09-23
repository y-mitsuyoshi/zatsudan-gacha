import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "推し活プロフィールメーカー - あなたの「好き」をカードに | 雑談テーマガチャ",
  description: "「推し活プロフィールメーカー」で、あなただけの推し紹介カードを簡単に作成！好きなところ、思い出のエピソード、名言などを詰め込んで、世界に一つだけのオリジナルプロフィールを共有しよう。 #推し活 #プロフィールメーカー",
  keywords: ['推し活', '推し', 'プロフィール', 'プロフィールメーカー', '自己紹介カード', 'オタク', 'ファン', 'アイドル', 'アニメ', 'ゲーム', '推し紹介', '推し語り', '推し活グッズ'],
  openGraph: {
    title: "推し活プロフィールメーカー - あなたの「好き」をカードに",
    description: "あなただけの推し紹介カードを簡単に作成！好きなところ、思い出のエピソードなどを詰め込んで、世界に一つだけのオリジナルプロフィールを共有しよう。",
    url: "https://zatsudan-gacha.web.app/profile-maker",
    siteName: "雑談テーマガチャ",
    images: [
      {
        url: "https://zatsudan-gacha.web.app/ogp.png",
        width: 1200,
        height: 630,
        alt: "推し活プロフィールメーカー",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "推し活プロフィールメーカー - あなたの「好き」をカードに",
    description: "あなただけの推し紹介カードを簡単に作成！好きなところ、思い出のエピソードなどを詰め込んで、世界に一つだけのオリジナルプロフィールを共有しよう。",
    images: ["https://zatsudan-gacha.web.app/ogp.png"],
  },
};

export default function ProfileMakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
