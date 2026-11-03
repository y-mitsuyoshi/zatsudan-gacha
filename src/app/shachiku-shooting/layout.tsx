import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '社畜シューティングNEO | 定時退社を目指す弾幕STG',
  description:
    '迫りくる業務（敵）を撃破して定時退社を目指せ！連射・拡散・追尾・レーザーの4武器、コンボ×グレイズ稼ぎ、予告付きフェア弾幕の全6ステージボス戦＋無限残業ループ。完全無料のストレス発散シューティング。',
  alternates: {
    canonical: '/shachiku-shooting',
  },
  openGraph: {
    title: '社畜シューティングNEO | 定時退社を目指す弾幕STG',
    description:
      '迫りくる業務（敵）を撃破して定時退社を目指せ！4武器×コンボ×グレイズ×全6ボスの弾幕シューティング。',
    url: '/shachiku-shooting',
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/assets/shooting_cover.jpg',
        width: 800,
        height: 447,
        alt: '社畜シューティングNEO',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '社畜シューティングNEO | 定時退社を目指す弾幕STG',
    description: '4武器×コンボ×グレイズ×全6ステージ。予告付きフェア弾幕と無限残業ループを楽しめる無料ブラウザシューティング。',
    images: ['/assets/shooting_cover.jpg'],
  },
};

export default function ShachikuShootingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
