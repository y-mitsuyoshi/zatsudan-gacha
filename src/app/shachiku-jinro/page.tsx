'use client';

import { useJinroGame } from '@/components/shachiku-jinro/useJinroGame';
import Lobby from '@/components/shachiku-jinro/Lobby';
import Dashboard from '@/components/shachiku-jinro/Dashboard';

export default function ShachikuJinroPage() {
  const [gameState, actions] = useJinroGame();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 font-sans text-gray-100">
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
  );
}
