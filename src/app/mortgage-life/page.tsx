import type { Metadata } from 'next';
import Link from 'next/link';
import { MortgageGame } from '@/components/mortgage/MortgageGame';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { AudioToggle } from '@/components/game/AudioToggle';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';
const game = GAME_SEO_DATA.mortgage;

export const metadata: Metadata = {
  title: `${game.name}｜35年・50年ローン完済を目指すリアル人生シミュレーション`,
  description: game.description,
  keywords: [
    '住宅ローン シミュレーション ゲーム',
    '住宅ローン破産',
    'マイホーム完済記',
    '人生シミュレーション 無料',
    'ペアローン',
    '変動金利 固定金利 50年ローン',
    'タワマン 一戸建て 比較',
    'ブラウザゲーム 無料',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: `${game.name}｜35年・50年ローン完済を目指すリアル人生シミュレーション`,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: `${APP_URL}${game.image}`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: game.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@zatsudan_gacha',
    title: `${game.name}｜35年・50年ローン完済を目指すリアル人生シミュレーション`,
    description: game.description,
    images: [
      {
        url: `${APP_URL}${game.image}`,
        width: 1200,
        height: 630,
        alt: game.name,
      },
    ],
  },
};

export default function MortgageLifePage() {
  return (
    <div className="min-h-screen bg-[#EBF0ED] text-[#13212A] transition-colors dark:bg-[#0D1316] dark:text-[#E1E9E6]">
      <div className="mx-auto max-w-[1320px] px-4 py-4 sm:px-6">
        {/* ミニマルな上部ユーティリティバー */}
        <nav
          aria-label="ページ上部ナビゲーション"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#C7D2CE] pb-3 text-xs text-[#4A5A61] dark:border-[#2A383D] dark:text-[#A3B2AF]"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/games"
              className="font-mono hover:text-[#8C1D3C] dark:hover:text-[#E2678A]"
            >
              ← 無料ゲーム一覧へ
            </Link>
            <span aria-hidden="true">·</span>
            <span className="font-editorial font-semibold text-[#13212A] dark:text-[#E1E9E6]">
              マイホーム完済記（35年・50年ローンの家計と暮らし）
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AudioToggle variant="compact" />
            <ThemeToggleButton />
          </div>
        </nav>

        <main role="main" className="pb-12">
          <MortgageGame />
        </main>
      </div>

      <SeoContentSection
        variant="light"
        eyebrow="MORTGAGE SIMULATION GUIDE"
        title={`${game.name}の特徴と遊び方`}
        intro={game.description}
        features={game.features}
        steps={game.steps}
        faqs={game.faqs}
        related={game.related}
        breadcrumbs={[
          { label: '雑談テーマガチャ', href: '/' },
          { label: '無料ゲーム一覧', href: '/games' },
          { label: game.name },
        ]}
        jsonLd={buildGameJsonLd(game)}
      />
    </div>
  );
}
