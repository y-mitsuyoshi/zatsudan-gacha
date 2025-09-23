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

  // Dummy data for now
  const endingTitle = ending === 'true' ? '円満退職' : ending === 'good' ? '平穏なサラリーマン人生' : '強制リタイア';
  const rank = ending === 'true' ? 'S' : ending === 'good' ? 'A' : 'C';


  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div ref={resultCardRef} className="bg-white dark:bg-gray-800 p-4">
            <h2 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-gray-200">結果発表</h2>

            <div className="text-center mb-4">
                <p className="text-lg">{playerName} ({job})さんの社畜ランクは...</p>
                <p className="text-6xl font-bold text-blue-500 my-4">{rank}</p>
                <p className="text-2xl font-semibold">{endingTitle}</p>
            </div>

            <div className="my-6">
                <h3 className="font-bold text-lg mb-2">プレイ結果</h3>
                <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                    <li>最終ターン: {turn}</li>
                    <li>最終やる気: {yaruki}</li>
                </ul>
            </div>

            {newlyUnlockedAchievements.length > 0 && (
                 <div className="my-6">
                    <h3 className="font-bold text-lg mb-2">今回解除した実績</h3>
                     <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                        {/* Map over newlyUnlockedAchievements here */}
                        {newlyUnlockedAchievements.map(ach => <li key={ach}>{ach}</li>)}
                    </ul>
                </div>
            )}

            <div className="my-6">
                <h3 className="font-bold text-lg mb-2">辿ったルート</h3>
                <PathGameBoard path={path} playerName={playerName} />
            </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
             <button
                onClick={handleRestart}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all"
            >
                もう一度プレイ
            </button>
            <button
                onClick={handleDownloadImage}
                className="w-full bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all"
            >
                結果を画像で保存
            </button>
        </div>
    </div>
  );
};
