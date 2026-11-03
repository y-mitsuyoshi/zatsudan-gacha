import type { Metadata } from 'next';
import ShachikuStackGame from '@/components/stack/ShachikuStackGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';
const game = GAME_SEO_DATA.stack;

export const metadata: Metadata = {
  title: `${game.name}｜クレーンでフロアを積む無料タイミング建設ゲーム`,
  description: game.description,
  keywords: [
    '社畜グラグラ決済タワー',
    '限界ビル建設',
    'タワー建設ゲーム 無料',
    'タイミングゲーム ブラウザ',
    'バランスゲーム 無料',
    '無料ブラウザゲーム',
    'ミニゲーム スマホ対応',
    '社畜ゲーム',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: `${game.name}｜クレーンでフロアを積む無料タイミング建設ゲーム`,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 800, height: 447, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${game.name}｜クレーンでフロアを積む無料タイミング建設ゲーム`,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function ShachikuStackPage() {
  return (
    <main className="bg-[#12100d]">
      <h1 className="sr-only">{game.h1}</h1>
      <ShachikuStackGame />
      <SeoContentSection
        variant="dark"
        eyebrow="GAME GUIDE"
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
    </main>
  );
}
