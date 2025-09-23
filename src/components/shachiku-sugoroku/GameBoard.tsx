"use client";

import React from 'react';
import { GAME_BOARD } from '@/lib/sugoroku-logic';
import { BoardSquare, SquareType } from '@/types/sugoroku';
import { PlayerToken } from './PlayerToken';

interface GameBoardProps {
  position: number;
  playerName: string;
}

const getSquareColor = (type: SquareType): string => {
  switch (type) {
    case 'start': return 'bg-green-200 dark:bg-green-800';
    case 'goal': return 'bg-yellow-200 dark:bg-yellow-800';
    case 'salary': return 'bg-blue-200 dark:bg-blue-800';
    case 'item': return 'bg-purple-200 dark:bg-purple-800';
    case 'event': return 'bg-red-200 dark:bg-red-800';
    case 'job-specific': return 'bg-indigo-200 dark:bg-indigo-800';
    default: return 'bg-slate-200 dark:bg-slate-700';
  }
};

const BoardSquareComponent: React.FC<{ square: BoardSquare }> = ({ square }) => {
  return (
    <div className={`relative border border-gray-400 dark:border-gray-600 rounded-md p-2 flex flex-col justify-between h-28 ${getSquareColor(square.type)}`}>
      <div className="font-bold text-sm text-gray-800 dark:text-gray-100">{square.position}</div>
      <div className="text-xs text-center text-gray-700 dark:text-gray-300">{square.title}</div>
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ position, playerName }) => {
  return (
    <div className="grid grid-cols-6 gap-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
      {GAME_BOARD.map((square) => (
        <div key={square.position} className="relative">
          <BoardSquareComponent square={square} />
          {position === square.position && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
               <PlayerToken playerName={playerName} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
