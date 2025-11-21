'use client';

import { useEffect, useRef, useState } from 'react';
import { type Game } from 'phaser';
import html2canvas from 'html2canvas';

interface GameStats {
    score: number;
    stage: number;
}

export default function ShachikuGame() {
  const gameRef = useRef<Game | null>(null);
  const [gameOverStats, setGameOverStats] = useState<GameStats | null>(null);

  useEffect(() => {
    let ignore = false;

    const initGame = async () => {
      // Avoid double initialization
      if (gameRef.current || ignore) return;

      const Phaser = await import('phaser');
      const { default: config } = await import('@/game/config');

      const { BootScene } = await import('@/game/scenes/BootScene');
      const { PreloadScene } = await import('@/game/scenes/PreloadScene');
      const { TitleScene } = await import('@/game/scenes/TitleScene');
      const { MainScene } = await import('@/game/scenes/MainScene');
      const { GameOverScene } = await import('@/game/scenes/GameOverScene');

      // Double check before creating
      if (ignore) return;

      const gameConfig = {
        ...config,
        scene: [BootScene, PreloadScene, TitleScene, MainScene, GameOverScene],
      };

      gameRef.current = new Phaser.Game(gameConfig);
    };

    initGame();

    const handleGameOver = (e: Event) => {
        const customEvent = e as CustomEvent<GameStats>;
        setGameOverStats(customEvent.detail);
    };

    window.addEventListener('shachiku-game-over', handleGameOver);

    return () => {
      ignore = true;
      window.removeEventListener('shachiku-game-over', handleGameOver);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleShare = async () => {
      const element = document.getElementById('result-card');
      if (element) {
          const canvas = await html2canvas(element);
          const image = canvas.toDataURL('image/png');

          // Share API or Download
          if (navigator.share) {
              const blob = await (await fetch(image)).blob();
              const file = new File([blob], 'shachiku-result.png', { type: 'image/png' });
              try {
                  await navigator.share({
                      title: '社畜シューティング',
                      text: `Stage ${gameOverStats?.stage} 炎上プロジェクトにて散る... 残業代: ${gameOverStats?.score}円 #社畜シューティング`,
                      files: [file]
                  });
              } catch (error) {
                  console.log('Share failed', error);
              }
          } else {
              // Fallback: Open image
              const link = document.createElement('a');
              link.download = 'shachiku-result.png';
              link.href = image;
              link.click();
          }
      }
  };

  const handleRetry = () => {
      setGameOverStats(null);
      if (gameRef.current) {
          // Restart game
          const scene = gameRef.current.scene.getScene('GameOverScene');
          scene.scene.start('MainScene', { score: 0, stage: 1 });
      }
  };

  return (
    <div className="relative w-full h-screen flex justify-center items-center bg-black">
      <div
        id="game-container"
        className="w-full h-full md:max-w-[360px] md:max-h-[640px]"
      />

      {gameOverStats && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white p-4">
              <div id="result-card" className="bg-gray-800 p-6 rounded-lg shadow-lg text-center w-full max-w-sm border border-gray-600">
                  <h2 className="text-3xl font-bold mb-4 text-red-500">過労死 (GAME OVER)</h2>
                  <div className="mb-2 text-xl">到達: Stage {gameOverStats.stage}</div>
                  <div className="mb-4 text-2xl font-mono text-yellow-400">残業代: {gameOverStats.score.toLocaleString()}円</div>
                  <div className="text-sm text-gray-400 mb-6">
                      称号: {getRank(gameOverStats.score)}
                  </div>
              </div>

              <div className="mt-6 flex gap-4">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2 bg-green-600 rounded hover:bg-green-500 transition"
                  >
                      再出社
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 transition"
                  >
                      戦績をシェア
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}

function getRank(score: number): string {
    if (score < 1000) return "新入社員";
    if (score < 5000) return "万年係長";
    if (score < 10000) return "中間管理職";
    return "伝説の社畜";
}
