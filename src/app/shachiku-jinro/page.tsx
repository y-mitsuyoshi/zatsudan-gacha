'use client';

import { useJinroGame } from '@/components/shachiku-jinro/useJinroGame';
import Lobby from '@/components/shachiku-jinro/Lobby';
import Dashboard from '@/components/shachiku-jinro/Dashboard';
import { useBgm } from '@/components/game/AudioToggle';
import type { BgmTrackId } from '@/game/common/bgmTracks';
import { SeoContentSection } from '@/components/seo/SeoContentSection';
import { GAME_SEO_DATA, buildGameJsonLd } from '@/lib/gameSeoData';

const game = GAME_SEO_DATA.jinro;

function getTrackForPhase(phase: string): BgmTrackId {
  switch (phase) {
    case 'LOBBY':
    case 'GAME_OVER':
      return 'shachiku-menu';
    case 'NIGHT_ACTION':
    case 'NIGHT_RESULT':
      return 'jinro-night';
    default:
      return 'jinro-day';
  }
}

export default function ShachikuJinroPage() {
  const [gameState, actions] = useJinroGame();
  const track = getTrackForPhase(gameState.phase);
  useBgm(track, actions.isPaused);

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
            onClaimRole={actions.claimRole}
            onClaimResult={actions.claimResult}
            onSpeakStance={actions.speakStance}
            onSpeakGeneral={actions.speakGeneral}
            onFlushNext={actions.flushNextLine}
            isPaused={actions.isPaused}
            onTogglePause={actions.togglePause}
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
