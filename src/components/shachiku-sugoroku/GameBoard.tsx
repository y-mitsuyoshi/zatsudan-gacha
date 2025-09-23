"use client";

import React from 'react';
import { GAME_BOARD } from '../../lib/sugoroku-logic';
import { BoardSquare, SquareType } from '../../types/sugoroku';
import { PlayerToken } from './PlayerToken';

interface GameBoardProps {
  position: number;
  playerName: string;
  previousPosition?: number;
  isMoving?: boolean;
  diceValue?: number | null;
}

const getSquareColor = (type: SquareType): string => {
  switch (type) {
    case 'start': return 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 border-emerald-700 shadow-emerald-200';
    case 'goal': return 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 border-orange-600 shadow-yellow-200';
    case 'salary': return 'bg-gradient-to-br from-blue-400 via-sky-500 to-cyan-500 border-cyan-600 shadow-blue-200';
    case 'item': return 'bg-gradient-to-br from-purple-400 via-violet-500 to-purple-600 border-purple-700 shadow-purple-200';
    case 'job-specific': return 'bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600 border-indigo-700 shadow-indigo-200';
    case 'event': return 'bg-gradient-to-br from-red-400 via-pink-500 to-rose-500 border-rose-600 shadow-red-200';
    default: return 'bg-gradient-to-br from-slate-300 via-gray-300 to-slate-400 border-slate-500 shadow-slate-200';
  }
};

const getSquareIcon = (type: SquareType): string => {
  switch (type) {
    case 'start': return '🏁';
    case 'goal': return '🏆';
    case 'salary': return '💰';
    case 'item': return '📦';
    case 'job-specific': return '💼';
    case 'event': return '⚡';
    default: return '📍';
  }
};

const BoardSquareComponent: React.FC<{ 
  square: BoardSquare; 
  isActive: boolean; 
  isInPath: boolean;
  isPrevious: boolean;
}> = ({ square, isActive, isInPath, isPrevious }) => {
  return (
    <div className={`
      relative border-3 rounded-2xl p-3 flex flex-col justify-between h-32 transition-all duration-700 transform-gpu
      ${getSquareColor(square.type)}
      ${isActive ? 'ring-4 ring-yellow-400 ring-opacity-90 shadow-2xl scale-110 z-30 animate-pulse' : ''}
      ${isInPath ? 'ring-2 ring-orange-300 ring-opacity-80 scale-105 shadow-xl animate-bounce' : ''}
      ${isPrevious ? 'ring-2 ring-gray-400 ring-opacity-60 scale-95 opacity-70' : ''}
      ${!isActive && !isInPath && !isPrevious ? 'shadow-lg hover:shadow-xl hover:scale-105 hover:rotate-1' : ''}
    `}>
      {/* Position Number - Enhanced */}
      <div className={`
        absolute -top-3 -left-3 w-8 h-8 rounded-full border-3 flex items-center justify-center
        ${isActive ? 'bg-yellow-400 border-yellow-600 animate-spin' : 'bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600'}
      `}>
        <span className={`text-xs font-bold ${isActive ? 'text-gray-800' : 'text-gray-700 dark:text-gray-300'}`}>
          {square.position}
        </span>
      </div>
      
      {/* Square Icon - Enhanced */}
      <div className="flex justify-center items-start pt-1">
        <span className={`text-3xl drop-shadow-2xl transition-all duration-500 ${isActive ? 'animate-bounce scale-125' : 'hover:scale-110'}`}>
          {getSquareIcon(square.type)}
        </span>
      </div>
      
      {/* Square Title - Enhanced */}
      <div className="text-center mt-auto">
        <div className={`
          text-xs font-bold leading-tight px-2 py-1.5 rounded-lg backdrop-blur-sm transition-all duration-300
          ${isActive 
            ? 'bg-white/90 text-gray-800 shadow-lg scale-105' 
            : 'bg-white/60 dark:bg-black/60 text-gray-800 dark:text-white'
          }
        `}>
          {square.title}
        </div>
      </div>
      
      {/* Special Effects - Enhanced */}
      {square.type === 'salary' && (
        <div className="absolute top-2 right-2 text-yellow-400 animate-bounce">
          <span className="text-sm">�</span>
        </div>
      )}
      {square.type === 'item' && (
        <div className="absolute top-2 right-2 text-purple-400 animate-pulse">
          <span className="text-sm">✨</span>
        </div>
      )}
      {square.type === 'job-specific' && (
        <div className="absolute bottom-1 right-1 text-indigo-300 animate-ping">
          <span className="text-xs">🎯</span>
        </div>
      )}
      {square.type === 'event' && (
        <div className="absolute top-1 left-1 text-red-300 animate-pulse">
          <span className="text-xs">⚠️</span>
        </div>
      )}
      
      {/* Active Square Glow Effect */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-orange-200 rounded-2xl animate-pulse opacity-30 -z-10" />
      )}
      
      {/* Path Trail Effect */}
      {isInPath && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-red-200 rounded-2xl animate-pulse opacity-40 -z-10" />
      )}
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ 
  position, 
  playerName, 
  previousPosition = 0,
  isMoving = false,
  diceValue = null
}) => {
  const [showEventPopup, setShowEventPopup] = React.useState<{square: BoardSquare | null, show: boolean}>({square: null, show: false});
  const [movementPath, setMovementPath] = React.useState<number[]>([]);
  
  React.useEffect(() => {
    // 移動パスの計算
    if (isMoving && previousPosition !== position) {
      const path = [];
      for (let i = previousPosition + 1; i <= position; i++) {
        path.push(i);
      }
      setMovementPath(path);
    } else if (!isMoving) {
      setMovementPath([]);
      
      // 移動完了時のイベント表示
      const currentSquare = GAME_BOARD.find(s => s.position === position);
      if (currentSquare && currentSquare.effect && position > 0 && position !== previousPosition) {
        setTimeout(() => {
          setShowEventPopup({square: currentSquare, show: true});
          setTimeout(() => setShowEventPopup({square: null, show: false}), 3500);
        }, 1000);
      }
    }
  }, [position, isMoving, previousPosition]);

  // ボードを行ごとに分割（蛇行パターン）
  const rows = [];
  const squaresPerRow = 10;
  const totalRows = Math.ceil(51 / squaresPerRow);

  for (let row = 0; row < totalRows; row++) {
    const rowSquares = [];
    const startSquare = row * squaresPerRow;
    const endSquare = Math.min((row + 1) * squaresPerRow - 1, 50);
    
    for (let squarePos = startSquare; squarePos <= endSquare; squarePos++) {
      const square = GAME_BOARD.find(s => s.position === squarePos);
      if (square) {
        rowSquares.push(square);
      }
    }
    
    // 奇数行は逆順にして蛇行パターンを作る
    if (row % 2 === 1) {
      rowSquares.reverse();
    }
    
    rows.push(rowSquares);
  }

  return (
    <div className="relative">
      {/* Railway Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-3xl border border-amber-200/50 dark:border-gray-600/50 shadow-2xl">
        {/* 線路の枕木パターン */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 15 }, (_, i) => (
            <div 
              key={i} 
              className="absolute w-full h-2 bg-amber-800 dark:bg-amber-600 rounded-sm" 
              style={{ top: `${i * 6.67}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Dice Display */}
      {diceValue && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-2xl shadow-2xl animate-bounce border-4 border-white">
          <span className="animate-pulse">🎲 {diceValue}</span>
        </div>
      )}
      
      {/* Event Popup - Enhanced */}
      {showEventPopup.show && showEventPopup.square && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md">
          <div className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-2xl p-8 shadow-2xl border-4 border-gradient-to-r from-yellow-400 to-orange-400 animate-pulse">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-bounce">{getSquareIcon(showEventPopup.square.type)}</div>
              <div className="font-bold text-xl text-gray-800 dark:text-white mb-3 leading-tight">
                {showEventPopup.square.title}
              </div>
              <div className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                {showEventPopup.square.description}
              </div>
              <div className="text-3xl mt-4 animate-bounce delay-300">✨</div>
            </div>
            {/* 閉じるボタン */}
            <button 
              onClick={() => setShowEventPopup({square: null, show: false})}
              className="absolute top-2 right-2 w-8 h-8 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Game Board */}
      <div className="relative p-8 bg-gradient-to-br from-white/60 to-amber-50/60 dark:from-gray-800/60 dark:to-gray-700/60 rounded-3xl backdrop-blur-sm border-2 border-amber-200/30 dark:border-gray-600/30 shadow-inner">
        <div className="space-y-6">
          {rows.map((rowSquares, rowIndex) => (
            <div key={rowIndex} className="relative">
              {/* 線路表示 */}
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <div className="w-full h-1 bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400 rounded-full shadow-lg opacity-60" />
              </div>
              
              {/* 駅名表示 */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg border border-blue-500">
                <span className="block text-xs opacity-80">第{rowIndex + 1}区間</span>
                <span>🚉</span>
              </div>
              
              <div className="flex gap-4 relative z-10">
                {rowSquares.map((square) => (
                  <div key={square.position} className="relative flex-1">
                    <BoardSquareComponent 
                      square={square} 
                      isActive={position === square.position}
                      isInPath={movementPath.includes(square.position)}
                      isPrevious={previousPosition === square.position && isMoving}
                    />
                    
                    {/* Player Token */}
                    {position === square.position && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                        <div className="transform transition-all duration-500 ease-in-out hover:scale-110">
                          <PlayerToken playerName={playerName} />
                        </div>
                        {/* 到着エフェクト */}
                        {!isMoving && (
                          <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-60" />
                        )}
                      </div>
                    )}
                    
                    {/* 移動軌跡表示 */}
                    {isMoving && movementPath.includes(square.position) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/40 to-orange-300/40 rounded-2xl animate-pulse border-2 border-yellow-500/60 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-ping" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* 装飾要素 */}
        <div className="absolute -top-6 -left-6 text-4xl animate-bounce">🚉</div>
        <div className="absolute -bottom-6 -right-6 text-3xl animate-pulse delay-1000">🚥</div>
        <div className="absolute top-1/3 -right-6 text-2xl animate-pulse delay-500">�</div>
        <div className="absolute -top-6 right-1/4 text-lg animate-bounce delay-700">�</div>
        <div className="absolute bottom-1/3 -left-6 text-xl animate-pulse delay-300">🎪</div>
      </div>
      
      {/* 移動中の効果音表示 */}
      {isMoving && (
        <div className="absolute bottom-6 left-6 bg-black/80 text-white px-4 py-3 rounded-2xl text-base font-bold animate-pulse border border-white/20">
          <span className="animate-bounce inline-block mr-2">�</span>
          ガタンゴトン... 移動中
        </div>
      )}
      
      {/* ゲーム進行状況表示 */}
      <div className="absolute top-6 right-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-600/50">
        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {isMoving ? '🏃‍♂️ 移動中...' : '⭐ 待機中'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          現在地: {position}/50
        </div>
      </div>
    </div>
  );
};