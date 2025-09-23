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
    case 'start': return 'bg-gradient-to-br from-green-300 to-green-500 dark:from-green-600 dark:to-green-800 border-green-600 dark:border-green-400';
    case 'goal': return 'bg-gradient-to-br from-yellow-300 to-yellow-500 dark:from-yellow-600 dark:to-yellow-800 border-yellow-600 dark:border-yellow-400';
    case 'salary': return 'bg-gradient-to-br from-blue-300 to-blue-500 dark:from-blue-600 dark:to-blue-800 border-blue-600 dark:border-blue-400';
    case 'item': return 'bg-gradient-to-br from-purple-300 to-purple-500 dark:from-purple-600 dark:to-purple-800 border-purple-600 dark:border-purple-400';
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
    case 'job-specific': return '💼';
    default: return '📍';
  }
};

const BoardSquareComponent: React.FC<{ square: BoardSquare; isActive: boolean }> = ({ square, isActive }) => {
  return (
    <div className={`
      relative border-2 rounded-xl p-2 flex flex-col justify-between h-24 transition-all duration-300
      ${getSquareColor(square.type)}
      ${isActive ? 'ring-4 ring-blue-400 ring-opacity-75 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
      transform hover:scale-102
    `}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold bg-white/80 dark:bg-gray-800/80 rounded px-1 text-gray-800 dark:text-white">
          {square.position}
        </span>
        <span className="text-lg">{getSquareIcon(square.type)}</span>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-800 dark:text-white leading-tight">
          {square.title}
        </div>
      </div>
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
  const [currentAnimatingPosition, setCurrentAnimatingPosition] = React.useState(position);
  const [showEventPopup, setShowEventPopup] = React.useState<{square: BoardSquare | null, show: boolean}>({square: null, show: false});
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  React.useEffect(() => {
    // 移動中は段階的アニメーションを実行
    if (isMoving && previousPosition !== position && !isAnimating) {
      setIsAnimating(true);
      
      const animateStepByStep = async () => {
        const start = previousPosition;
        const end = position;
        const direction = end > start ? 1 : -1;
        const steps = Math.abs(end - start);
        
        for (let step = 1; step <= steps; step++) {
          const nextPosition = start + (direction * step);
          setCurrentAnimatingPosition(nextPosition);
          await new Promise(resolve => setTimeout(resolve, 800)); // ゆっくり800ms間隔
        }
        
        setIsAnimating(false);
        
        // 最終位置でのイベント表示
        const finalSquare = GAME_BOARD.find(s => s.position === position);
        if (finalSquare && (finalSquare.type === 'item' || finalSquare.type === 'salary' || finalSquare.type === 'job-specific')) {
          setShowEventPopup({square: finalSquare, show: true});
          setTimeout(() => setShowEventPopup({square: null, show: false}), 3000);
        }
      };
      
      animateStepByStep();
    } else if (!isMoving && !isAnimating) {
      // 移動中でないときは即座に位置を更新
      setCurrentAnimatingPosition(position);
    }
  }, [position, isMoving, previousPosition, isAnimating]);

  const getMovementPath = () => {
    if (!isMoving || previousPosition === position) return [];
    const path = [];
    const start = Math.min(previousPosition, position);
    const end = Math.max(previousPosition, position);
    for (let i = start + 1; i <= end; i++) {
      path.push(i);
    }
    return path;
  };

  const movementPath = getMovementPath();

  // ボードを行ごとに分割
  const rows = [];
  const squaresPerRow = 10;
  const totalRows = Math.ceil(51 / squaresPerRow); // 0-50で51マス

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
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 rounded-2xl">
        {/* 枕木パターン */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }, (_, i) => (
            <div 
              key={i} 
              className="absolute w-full h-1 bg-amber-800 dark:bg-amber-600" 
              style={{ top: `${i * 5}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Dice value display */}
      {diceValue && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-2xl animate-bounce border-2 border-white">
          🎲 {diceValue}
        </div>
      )}
      
      {/* Event Popup */}
      {showEventPopup.show && showEventPopup.square && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl border-4 border-yellow-400 animate-pulse">
          <div className="text-center">
            <div className="text-4xl mb-2">{getSquareIcon(showEventPopup.square.type)}</div>
            <div className="font-bold text-lg text-gray-800 dark:text-white mb-2">{showEventPopup.square.title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{showEventPopup.square.description}</div>
            <div className="text-2xl mt-2 animate-bounce">✨</div>
          </div>
        </div>
      )}
      
      {/* Railway Tracks */}
      <div className="absolute inset-4 pointer-events-none">
        {/* レールライン */}
        <div className="absolute inset-0">
          {rows.map((_, rowIndex) => (
            <div key={rowIndex} className="absolute w-full flex" style={{ top: `${rowIndex * (100 / totalRows)}%`, height: `${100 / totalRows}%` }}>
              {/* 上レール */}
              <div className="absolute top-2 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 rounded-full shadow-sm" />
              {/* 下レール */}
              <div className="absolute bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 rounded-full shadow-sm" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="relative p-6 bg-gradient-to-br from-white/40 to-amber-50/40 dark:from-gray-800/40 dark:to-gray-700/40 rounded-2xl backdrop-blur-sm border-2 border-amber-200/50 dark:border-gray-600/50 shadow-xl">
        <div className="space-y-4">
          {rows.map((rowSquares, rowIndex) => (
            <div key={rowIndex} className="flex gap-3 relative">
              {/* 駅名表示 */}
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                {rowIndex + 1}番線
              </div>
              
              {rowSquares.map((square) => (
                <div key={square.position} className="relative flex-1">
                  {/* 駅ホーム背景 */}
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-inner" />
                  
                  <BoardSquareComponent 
                    square={square} 
                    isActive={currentAnimatingPosition === square.position}
                  />
                  
                  {/* Movement path visualization */}
                  {isMoving && movementPath.includes(square.position) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-300 bg-opacity-60 rounded-xl animate-pulse border-2 border-yellow-500 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-ping" />
                    </div>
                  )}
                  
                  {/* Player token */}
                  {currentAnimatingPosition === square.position && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-400 ease-in-out">
                       <div className="transform hover:scale-110 transition-transform">
                         <PlayerToken playerName={playerName} />
                       </div>
                       {/* 到着エフェクト */}
                       <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75" />
                    </div>
                  )}
                  
                  {/* Previous position indicator */}
                  {isMoving && previousPosition === square.position && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-lg opacity-60 animate-pulse">
                        🚂
                      </div>
                    </div>
                  )}

                  {/* Railway Direction Indicators */}
                  {square.position > 0 && square.position < 50 && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-5">
                      <div className="text-lg text-blue-600 dark:text-blue-400 opacity-80 animate-pulse">
                        {rowIndex % 2 === 0 ? '🚊' : '🚇'}
                      </div>
                    </div>
                  )}
                  
                  {/* 特別なマスの装飾 */}
                  {square.type === 'start' && (
                    <div className="absolute -top-2 -left-2 text-2xl animate-bounce">🏁</div>
                  )}
                  {square.type === 'goal' && (
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🏯</div>
                  )}
                  {square.type === 'job-specific' && (
                    <div className="absolute -bottom-1 -right-1 text-sm animate-pulse">💼</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Railway Decorative elements */}
        <div className="absolute -top-4 -left-4 text-3xl animate-bounce">🚉</div>
        <div className="absolute -bottom-4 -right-4 text-2xl animate-pulse delay-1000">🚥</div>
        <div className="absolute top-1/2 -right-4 text-xl animate-pulse delay-500">🔔</div>
        <div className="absolute -top-4 right-1/4 text-sm animate-bounce delay-700">💨</div>
      </div>
      
      {/* Sound effects display */}
      {isMoving && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded-full text-sm font-bold animate-pulse">
          🚂 ガタンゴトン...
        </div>
      )}
    </div>
  );
};