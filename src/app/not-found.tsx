import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = 'https://zatsudan-gacha.app';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  description: 'お探しのページは見つかりませんでした。',
  openGraph: {
    title: 'ページが見つかりません',
    description: 'お探しのページは見つかりませんでした。',
    url: `${APP_URL}/404`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/ogp.png`,
        width: 1200,
        height: 630,
        alt: 'ページが見つかりません',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@zatsudan_gacha',
    title: 'ページが見つかりません',
    description: 'お探しのページは見つかりませんでした。',
    images: [`${APP_URL}/ogp.png`],
  },
};

export default function NotFound() {
  return (
    <main className="paper-page flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center paper-panel p-8">
        <p className="font-editorial text-6xl text-[var(--accent)] mb-3">404</p>
        <h1 className="font-editorial text-2xl text-[var(--ink)] mb-3">
          ページが見つかりません
        </h1>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-6">
          お探しのページは移動または削除された可能性があります。URLをご確認いただくか、トップページから目的のページをお探しください。
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/"
            className="paper-button-primary px-5 py-3 text-sm"
          >
            トップページへ
          </Link>
          <Link
            href="/themes"
            className="paper-button px-5 py-3 text-sm"
          >
            お題カテゴリ一覧へ
          </Link>
        </div>
      </div>
    </main>
  );
}
