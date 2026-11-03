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
    '1in8b',
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
    images: [{ url: `${APP_URL}${game.image}`, width: 1200, height: 630, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${game.name}｜35年・50年ローン完済を目指すリアル人生シミュレーション`,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function MortgageLifePage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6">
        <header className="mb-6 overflow-hidden rounded-3xl border-2 border-slate-800 bg-slate-950 text-white shadow-xl">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-500/15 font-mono text-amber-300">
                <span className="text-[8px] font-black leading-none">1 IN 13M</span>
                <span className="mt-0.5 text-base font-black leading-none">35/50Y</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-editorial text-xl font-black tracking-tight text-white sm:text-3xl">
                    {game.name}
                  </h1>
                  <span className="rounded bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-black text-slate-950">
                    MORTGAGE SURVIVAL CHRONICLE
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-300 sm:text-sm">
                  銀行審査・タワマンvs戸建て・ペアローン・35年/50年・元利/元金均等・団信・住宅ローン控除・日銀利上げを生き抜くリアル年代記
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/games"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
              >
                ゲーム一覧へ
              </Link>
              <AudioToggle variant="compact" />
              <ThemeToggleButton />
            </div>
          </div>
        </header>

        <main role="main">
          <MortgageGame />
        </main>
      </div>

      <SeoContentSection
        variant="dark"
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
