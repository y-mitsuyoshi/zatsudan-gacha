'use client';

import { useJinroGame } from '@/components/shachiku-jinro/useJinroGame';
import Lobby from '@/components/shachiku-jinro/Lobby';
import Dashboard from '@/components/shachiku-jinro/Dashboard';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const game = GAME_SEO_DATA.jinro;

export default function ShachikuJinroPage() {
  const [gameState, actions] = useJinroGame();

  return (
    <div className="game-night min-h-screen font-sans">
      <div>
        {gameState.phase === 'LOBBY' ? (
          <Lobby onStart={actions.startGame} />
        ) : (
          <Dashboard
            gameState={gameState}
            onVote={actions.submitVote}
            onNightAction={actions.submitNightAction}
            onSkip={actions.skipPhase}
            onReset={actions.resetGame}
          />
        )}
      </div>
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
    </div>
  );
}
