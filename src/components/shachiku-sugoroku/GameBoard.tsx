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
    case 'start': return 'bg-gradient-to-br from-green-300 to-green-500 dark:from-green-600 dark:to-green-800 border-green-600 dark:border-green-400';
    case 'goal': return 'bg-gradient-to-br from-yellow-300 to-yellow-500 dark:from-yellow-600 dark:to-yellow-800 border-yellow-600 dark:border-yellow-400';
    case 'salary': return 'bg-gradient-to-br from-blue-300 to-blue-500 dark:from-blue-600 dark:to-blue-800 border-blue-600 dark:border-blue-400';
    case 'item': return 'bg-gradient-to-br from-purple-300 to-purple-500 dark:from-purple-600 dark:to-purple-800 border-purple-600 dark:border-purple-400';
    case 'event': return 'bg-gradient-to-br from-red-300 to-red-500 dark:from-red-600 dark:to-red-800 border-red-600 dark:border-red-400';
    case 'job-specific': return 'bg-gradient-to-br from-indigo-300 to-indigo-500 dark:from-indigo-600 dark:to-indigo-800 border-indigo-600 dark:border-indigo-400';
    default: return 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border-slate-400 dark:border-slate-600';
  }
};

const getSquareIcon = (type: SquareType): string => {
  switch (type) {
    case 'start': return '🏁';
    case 'goal': return '🏆';
    case 'salary': return '💰';
    case 'item': return '📦';
    case 'event': return '⚡';
    case 'job-specific': return '💼';
    default: return '📍';
  }
};

const BoardSquareComponent: React.FC<{ square: BoardSquare; isActive: boolean }> = ({ square, isActive }) => {
  return (
    <div className={`
      relative border-2 rounded-xl p-2 flex flex-col justify-between h-32 transition-all duration-300
      ${getSquareColor(square.type)}
      ${isActive ? 'ring-4 ring-blue-400 ring-opacity-75 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
      transform hover:scale-102
    `}>
      <div className="flex justify-between items-start">
        <div className="bg-white bg-opacity-80 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-800">
          {square.position}
        </div>
        <div className="text-lg">{getSquareIcon(square.type)}</div>
      </div>
      
      <div className="text-center">
        <div className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight mb-1">
          {square.title}
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-200 opacity-80 leading-tight">
          {square.type === 'start' ? 'スタート' : 
           square.type === 'goal' ? 'ゴール' :
           square.type === 'salary' ? '給料日' :
           square.type === 'item' ? 'アイテム' :
           square.type === 'event' ? 'イベント' :
           square.type === 'job-specific' ? '職業専用' : '通常'}
        </div>
      </div>
      
      {isActive && (
        <div className="absolute inset-0 bg-blue-400 bg-opacity-20 rounded-xl animate-pulse"></div>
      )}
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ position, playerName }) => {
  return (
    <div className="relative">
      {/* Board Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 dark:from-green-900/20 dark:via-blue-900/20 dark:to-purple-900/20 rounded-2xl"></div>
      
      <div className="relative grid grid-cols-6 gap-3 p-6 bg-white/30 dark:bg-gray-800/30 rounded-2xl backdrop-blur-sm border border-white/50 dark:border-gray-700/50">
        {GAME_BOARD.map((square) => (
          <div key={square.position} className="relative">
            <BoardSquareComponent square={square} isActive={position === square.position} />
            {position === square.position && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                 <PlayerToken playerName={playerName} />
              </div>
            )}
          </div>
        ))}
        
        {/* Decorative elements */}
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-400 rounded-full opacity-60 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 -right-2 w-4 h-4 bg-green-400 rounded-full opacity-60 animate-pulse delay-500"></div>
      </div>
    </div>
  );
};
