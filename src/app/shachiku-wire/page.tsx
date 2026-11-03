import type { Metadata } from 'next';
import ShachikuWireGame from '@/components/wire/ShachikuWireGame';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const APP_URL = 'https://zatsudan-gacha.app';
const game = GAME_SEO_DATA.wire;

export const metadata: Metadata = {
  title: `${game.name}｜振り子物理で空を飛ぶ無料ワイヤーアクション`,
  description: game.description,
  keywords: [
    '社畜ワイヤー疾走',
    '終電スイングアクション',
    'ワイヤーアクション 無料',
    'スイングゲーム ブラウザ',
    'ワンボタン アクションゲーム',
    '無料ブラウザゲーム',
    'ミニゲーム 暇つぶし',
    '社畜ゲーム',
  ],
  alternates: {
    canonical: game.slug,
  },
  openGraph: {
    title: `${game.name}｜振り子物理で空を飛ぶ無料ワイヤーアクション`,
    description: game.description,
    url: `${APP_URL}${game.slug}`,
    siteName: '雑談テーマガチャ',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: `${APP_URL}${game.image}`, width: 800, height: 447, alt: game.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${game.name}｜振り子物理で空を飛ぶ無料ワイヤーアクション`,
    description: game.description,
    images: [`${APP_URL}${game.image}`],
  },
};

export default function ShachikuWirePage() {
  return (
    <main className="bg-[#12100d]">
      <h1 className="sr-only">{game.h1}</h1>
      <ShachikuWireGame />
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
