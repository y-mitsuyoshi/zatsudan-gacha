"use client";

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { GameState, SquareType } from '@/types/sugoroku';
import { GAME_BOARD } from '@/lib/sugoroku-logic';

// This is a simplified, non-interactive version of the board for display purposes.
const PathGameBoard = ({ path, playerName }: { path: number[], playerName: string }) => {
    const getSquareColor = (type: SquareType, position: number): string => {
        if (path.includes(position)) {
            if (position === 0) return 'bg-green-400 dark:bg-green-600';
            if (position === GAME_BOARD.length -1) return 'bg-yellow-400 dark:bg-yellow-600';
            return 'bg-blue-300 dark:bg-blue-500'; // Path color
        }
        switch (type) {
            case 'salary': return 'bg-blue-200 dark:bg-blue-800';
            case 'item': return 'bg-purple-200 dark:bg-purple-800';
            case 'event': return 'bg-red-200 dark:bg-red-800';
            case 'job-specific': return 'bg-indigo-200 dark:bg-indigo-800';
            default: return 'bg-slate-200 dark:bg-slate-700';
        }
    };

    return (
        <div className="grid grid-cols-6 gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-gray-300">
            {GAME_BOARD.map((square) => (
                <div key={square.position} className={`relative border border-gray-400/50 rounded h-12 flex items-center justify-center ${getSquareColor(square.type, square.position)}`}>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{square.position}</span>
                </div>
            ))}
        </div>
    );
};


interface ResultCardProps {
  gameState: GameState;
}

export const ResultCard: React.FC<ResultCardProps> = ({ gameState }) => {
  const resultCardRef = useRef<HTMLDivElement>(null);
  const { playerName, job, turn, yaruki, ending, newlyUnlockedAchievements, path } = gameState;

  const handleDownloadImage = () => {
    if (resultCardRef.current) {
      html2canvas(resultCardRef.current, {
          useCORS: true,
          backgroundColor: null, // Use element's background
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'shachiku-sugoroku-result.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const handleRestart = () => {
      window.location.reload();
  }

  // Ending data with more detail
  const getEndingData = () => {
    switch(ending) {
      case 'true':
        return {
          title: '🏆 レジェンド社員',
          subtitle: '円満退職',
          rank: 'S',
          description: '最高のパフォーマンスを発揮し、伝説の社員として名を残した。',
          bgColor: 'from-yellow-400 via-orange-400 to-red-500',
          textColor: 'text-white'
        };
      case 'good':
        return {
          title: '📈 安定サラリーマン',
          subtitle: '平穏なサラリーマン人生',
          rank: 'A',
          description: '大きな波乱もなく、安定した社畜ライフを全うした。',
          bgColor: 'from-green-400 via-blue-400 to-purple-500',
          textColor: 'text-white'
        };
      default:
        return {
          title: '💥 燃え尽き症候群',
          subtitle: '強制リタイア',
          rank: 'C',
          description: '心身ともに疲れ果て、ドクターストップにより退場となった…。',
          bgColor: 'from-gray-400 via-gray-500 to-gray-600',
          textColor: 'text-white'
        };
    }
  };

  const endingData = getEndingData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div ref={resultCardRef} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with gradient background */}
          <div className={`bg-gradient-to-r ${endingData.bgColor} p-8 text-center ${endingData.textColor}`}>
            <div className="animate-bounce mb-4">
              <div className="text-8xl font-bold drop-shadow-lg">{endingData.rank}</div>
            </div>
            <h1 className="text-4xl font-bold mb-2 drop-shadow-md">{endingData.title}</h1>
            <p className="text-xl opacity-90">{endingData.subtitle}</p>
          </div>

          {/* Player info section */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                {playerName} ({job}) さんの最終結果
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {endingData.description}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{turn}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">ターン数</div>
              </div>
              <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{yaruki}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">最終やる気</div>
              </div>
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{gameState.position}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">最終位置</div>
              </div>
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 p-6 rounded-xl text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{endingData.rank}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">ランク</div>
              </div>
            </div>

            {/* Achievements */}
            {newlyUnlockedAchievements.length > 0 && (
              <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-bold text-xl mb-4 text-yellow-800 dark:text-yellow-400 flex items-center">
                  🏅 今回解除した実績
                </h3>
                <div className="grid gap-2">
                  {newlyUnlockedAchievements.map(ach => (
                    <div key={ach} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-yellow-300 dark:border-yellow-700">
                      <span className="font-medium text-gray-800 dark:text-gray-200">✨ {ach}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Path visualization */}
            <div className="mb-8">
              <h3 className="font-bold text-xl mb-4 text-gray-800 dark:text-gray-200">🗺️ 辿ったルート</h3>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                <PathGameBoard path={path} playerName={playerName} />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleRestart}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            🔄 もう一度プレイ
          </button>
          <button
            onClick={handleDownloadImage}
            className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            📸 結果を画像で保存
          </button>
        </div>
      </div>
    </div>
  );
};
