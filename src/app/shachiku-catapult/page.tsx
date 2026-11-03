import type { Metadata } from 'next';
import ShachikuCatapultGame from '@/components/catapult/ShachikuCatapultGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';
const game = GAME_SEO_DATA.catapult;

export const metadata: Metadata = {
  title: `${game.name}｜飛距離と強化を楽しむ無料ぶっとばしアクション`,
  description: game.description,
  keywords: [
    '社畜ぶっとばし',
    '定時退社カタパルト',
    'ぶっとばしゲーム',
    '飛距離ゲーム 無料',
    'ブラウザゲーム 無料',
    'ミニゲーム アクション',
    '育成 アップグレード ゲーム',
    '社畜ゲーム',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: `${game.name}｜飛距離と強化を楽しむ無料ぶっとばしアクション`,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 800, height: 447, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${game.name}｜飛距離と強化を楽しむ無料ぶっとばしアクション`,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function ShachikuCatapultPage() {
  return (
    <main className="bg-[#12100d]">
      <h1 className="sr-only">{game.h1}</h1>
      <ShachikuCatapultGame />
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
