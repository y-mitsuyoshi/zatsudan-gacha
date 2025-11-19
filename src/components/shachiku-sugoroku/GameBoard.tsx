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
  isEventWait?: boolean;
}

const getSquareColor = (type: SquareType): string => {
  switch (type) {
    case 'start': return 'bg-emerald-100 border-emerald-400 text-emerald-700';
    case 'goal': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
    case 'salary': return 'bg-blue-100 border-blue-400 text-blue-700';
    case 'item': return 'bg-purple-100 border-purple-400 text-purple-700';
    case 'job-specific': return 'bg-indigo-100 border-indigo-400 text-indigo-700';
    case 'event': return 'bg-pink-100 border-pink-400 text-pink-700';
    default: return 'bg-white border-gray-200 text-gray-600';
  }
};

const getSquareIcon = (type: SquareType): string => {
  switch (type) {
    case 'start': return '🏁';
    case 'goal': return '🎊';
    case 'salary': return '💰';
    case 'item': return '🎁';
    case 'job-specific': return '💼';
    case 'event': return '⚡';
    default: return '';
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
      relative rounded-xl p-1 flex flex-col items-center justify-center h-20 w-full transition-all duration-500
      border-b-4 active:border-b-0 active:translate-y-1
      ${getSquareColor(square.type)}
      ${isActive ? 'transform scale-110 z-20 ring-4 ring-yellow-400 shadow-xl' : 'shadow-md hover:shadow-lg hover:-translate-y-0.5'}
      ${isInPath ? 'ring-2 ring-blue-400 ring-opacity-60 scale-105' : ''}
      ${isPrevious ? 'opacity-80' : ''}
    `}>
      {/* Position Number */}
      <div className="absolute top-1 left-1 text-[9px] font-bold opacity-50">
        {square.position}
      </div>
      
      {/* Icon */}
      <div className="text-xl mb-0.5 transform transition-transform hover:scale-125">
        {square.icon || getSquareIcon(square.type)}
      </div>
      
      {/* Title */}
      <div className="text-[9px] font-bold text-center leading-tight line-clamp-2 px-0.5 w-full overflow-hidden">
        {square.title}
      </div>
      
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({ 
  position, 
  playerName, 
  previousPosition = 0,
  isMoving = false,
  diceValue = null,
  isEventWait = false
}) => {
  const [showEventPopup, setShowEventPopup] = React.useState<{square: BoardSquare | null, show: boolean}>({square: null, show: false});
  const [movementPath, setMovementPath] = React.useState<number[]>([]);
  
  React.useEffect(() => {
    if (isMoving && previousPosition !== position) {
      const path = [];
      // Handle moving backwards too if needed, though usually forward
      if (position > previousPosition) {
          for (let i = previousPosition + 1; i <= position; i++) {
            path.push(i);
          }
      } else {
          // Moving backwards
          for (let i = previousPosition - 1; i >= position; i--) {
              path.push(i);
          }
      }
      setMovementPath(path);
    } else if (!isMoving) {
      setMovementPath([]);
    }

    // Show popup when waiting for event animation
    if (isEventWait) {
        const currentSquare = GAME_BOARD.find(s => s.position === position);
        if (currentSquare && currentSquare.effect) {
            setShowEventPopup({square: currentSquare, show: true});
            // Auto hide is handled by parent removing isEventWait, but we can also auto hide here for safety
            const timer = setTimeout(() => setShowEventPopup({square: null, show: false}), 2500);
            return () => clearTimeout(timer);
        }
    } else {
        // If not waiting, ensure popup is hidden (unless we want to keep it open for a bit?)
        // Actually, let's just hide it when isEventWait becomes false.
        setShowEventPopup({square: null, show: false});
    }

  }, [position, isMoving, previousPosition, isEventWait]);

  // Responsive Snake Layout Logic
  // We use CSS Grid with auto-fit/minmax for responsiveness, but to maintain the "snake" path visual,
  // we need to be careful. A pure CSS grid snake is hard.
  // Instead, we'll use a fixed column count that changes with breakpoints.
  // Mobile: 5 cols, Desktop: 10 cols.
  
  const renderRows = (cols: number) => {
      const rows = [];
      const totalRows = Math.ceil(61 / cols); // Updated for 60 items (0-60 = 61 items)

      for (let row = 0; row < totalRows; row++) {
        const rowSquares = [];
        const startSquare = row * cols;
        const endSquare = Math.min((row + 1) * cols - 1, 60);
        
        for (let squarePos = startSquare; squarePos <= endSquare; squarePos++) {
          const square = GAME_BOARD.find(s => s.position === squarePos);
          if (square) {
            rowSquares.push(square);
          }
        }
        
        // Reverse even rows (0, 2, 4...) for snake effect? 
        // Usually snake starts left->right (row 0), then right->left (row 1).
        // So row 1, 3, 5 should be reversed.
        const isReversed = row % 2 === 1;
        if (isReversed) {
          rowSquares.reverse();
        }
        
        rows.push({ squares: rowSquares, isReversed, rowIndex: row });
      }
      return rows;
  };

  // We render two versions and hide/show based on media query to ensure correct snake layout
  // This is a bit heavy but ensures the visual path is correct for both sizes.
  // Alternatively, we could use a resize observer, but CSS media queries are cleaner for SSR.
  
  const MobileRows = renderRows(5);
  const DesktopRows = renderRows(10);

  const BoardGrid = ({ rows, className }: { rows: any[], className: string }) => (
      <div className={`space-y-4 ${className}`}>
        {rows.map(({ squares, isReversed, rowIndex }) => (
            <div key={rowIndex} className="relative">
                {/* Connector Line Background */}
                <div className="absolute top-1/2 left-2 right-2 h-4 bg-gray-200 dark:bg-gray-700 -z-10 rounded-full transform -translate-y-1/2 opacity-50"></div>
                
                {/* Vertical Connectors (Curves) */}
                {rowIndex < rows.length - 1 && (
                    <div className={`absolute top-1/2 h-20 w-8 border-4 border-gray-200 dark:border-gray-700 -z-20 opacity-50
                        ${isReversed ? 'left-0 rounded-l-full border-r-0' : 'right-0 rounded-r-full border-l-0'}
                    `}></div>
                )}

                <div className={`grid ${rows === MobileRows ? 'grid-cols-5' : 'grid-cols-10'} gap-2`}>
                    {squares.map((square: BoardSquare) => (
                    <div key={square.position} className="relative">
                        <BoardSquareComponent 
                            square={square} 
                            isActive={position === square.position}
                            isInPath={movementPath.includes(square.position)}
                            isPrevious={previousPosition === square.position && isMoving}
                        />
                        
                        {/* Player Token */}
                        {position === square.position && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-500 ease-in-out">
                                <PlayerToken playerName={playerName} />
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
  );

  return (
    <div className="relative w-full">
      {/* Event Popup */}
      {showEventPopup.show && showEventPopup.square && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200 border-4 border-yellow-400 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
            
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">{showEventPopup.square.icon || getSquareIcon(showEventPopup.square.type)}</div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">
                {showEventPopup.square.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {showEventPopup.square.description}
              </p>
            </div>
            
            <button 
              onClick={() => setShowEventPopup({square: null, show: false})}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Board Container */}
      <div className="relative bg-[#f0f4f8] dark:bg-gray-900/50 rounded-3xl p-2 sm:p-6 overflow-hidden">
         {/* Mobile Layout (< 1024px) */}
         <BoardGrid rows={MobileRows} className="block lg:hidden" />
         
         {/* Desktop Layout (>= 1024px) */}
         <BoardGrid rows={DesktopRows} className="hidden lg:block" />
      </div>
    </div>
  );
};