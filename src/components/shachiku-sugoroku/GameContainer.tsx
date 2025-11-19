"use client";

import React, { useState } from 'react';
import { GameState } from '@/types/sugoroku';
import { takeTurn, moveOneStep, checkEndGame } from '@/lib/sugoroku-logic';
import { GameBoard } from './GameBoard';
import { YarukiGauge } from './YarukiGauge';
import { ResultCard } from './ResultCard';
import { DiceComponent } from './DiceComponent';
import { audioManager } from '@/utils/audio';

interface GameContainerProps {
  initialState: GameState;
}

export const GameContainer: React.FC<GameContainerProps> = ({ initialState }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [showDice, setShowDice] = useState(false);
  const [previousPosition, setPreviousPosition] = useState(initialState.position);
  const [isMoving, setIsMoving] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);

  // Movement logic using useEffect for stability
  React.useEffect(() => {
    let moveTimer: NodeJS.Timeout;

    // If waiting for event animation
    if (gameState.isEventWait) {
        const waitTimer = setTimeout(() => {
            setGameState(prev => {
                // Check if we are at goal (position 60)
                if (prev.position >= 60) {
                     // Trigger finish with calculated ending
                     return checkEndGame({ ...prev, isEventWait: false });
                }
                return { ...prev, isEventWait: false };
            });
        }, 2500); // Wait 2.5 seconds for event popup
        return () => clearTimeout(waitTimer);
    }

    if (isMoving && gameState.pendingMoves && gameState.pendingMoves !== 0) {
      moveTimer = setTimeout(() => {
        setGameState(prevState => moveOneStep(prevState));
      }, 500); // Move every 500ms (train-like speed)
    } else if (isMoving && (!gameState.pendingMoves || gameState.pendingMoves === 0)) {
      // Movement finished
      const finishTimer = setTimeout(() => {
        setIsMoving(false);
        setShowDice(false);
      }, 800);
      return () => clearTimeout(finishTimer);
    }

    return () => clearTimeout(moveTimer);
  }, [gameState.pendingMoves, isMoving, gameState.isEventWait]);

  const toggleSound = () => {
      const muted = audioManager.toggleMute();
      setIsSoundOn(!muted);
      if (!muted) {
          audioManager.playBgm();
      }
  };

  const handleDiceRollComplete = () => {
    // Calculate new game state after dice animation completes
    setTimeout(() => {
      setPreviousPosition(gameState.position);
      
      const newState = takeTurn(gameState, diceValue);
      setGameState(newState);
      setIsRolling(false);
      
      // Start step-by-step movement if there are pending moves
      if (newState.pendingMoves && newState.pendingMoves > 0) {
        setIsMoving(true);
      } else {
        // No movement needed (e.g. resting), hide dice
        setTimeout(() => setShowDice(false), 1500);
      }
    }, 600);
  };

  const handleTakeTurn = () => {
    if (isRolling || gameState.isFinished || isMoving || gameState.isEventWait) return;

    setIsRolling(true);
    setShowDice(true);
    audioManager.playSe('roll'); // Play roll sound
    
    // Generate dice value (1-6)
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
  };

  if (gameState.isFinished) {
    return <ResultCard gameState={gameState} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Sound Toggle Button */}
      <button 
        onClick={toggleSound}
        className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border-2 border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
        title={isSoundOn ? "Mute Sound" : "Enable Sound"}
      >
        {isSoundOn ? '🔊' : '🔇'}
      </button>

      {/* Left Column: Game Board (8 cols) */}
      <div className="lg:col-span-8 order-2 lg:order-1">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border-4 border-gray-100 dark:border-gray-700 relative">
           {/* Board Header */}
           <div className="absolute -top-5 left-6 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold shadow-lg transform -rotate-2 border-2 border-white">
             MAP
           </div>
           
          <div className="flex items-center justify-end mb-4">
             <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-bold">TURN</span>
                <span className="text-2xl font-black text-gray-800 dark:text-gray-200 font-mono">{gameState.turn}</span>
             </div>
          </div>
          
          <GameBoard 
            position={gameState.position} 
            playerName={gameState.playerName} 
            job={gameState.job}
            previousPosition={previousPosition}
            isMoving={isMoving}
            diceValue={showDice ? diceValue : null}
            isEventWait={gameState.isEventWait}
          />
        </div>
      </div>

      {/* Right Column: Status & Controls (4 cols) */}
      <div className="lg:col-span-4 order-1 lg:order-2 space-y-6">
        
        {/* Player Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border-b-8 border-blue-200 dark:border-blue-900 transform hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-3xl shadow-inner">
              🧑‍💼
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Player</div>
              <div className="text-xl font-black text-gray-800 dark:text-gray-100">{gameState.playerName}</div>
              <div className="inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-bold mt-1">
                {gameState.job}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              <span>START</span>
              <span>GOAL</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 shadow-inner overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full transition-all duration-500 relative"
                style={{ width: `${Math.min((gameState.position / 60) * 100, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            <div className="text-right text-xs font-bold text-purple-500 mt-1">
              {Math.round((gameState.position / 60) * 100)}% 完了
            </div>
          </div>

          {/* Yaruki Gauge */}
          <div className="mb-2">
             <YarukiGauge value={gameState.yaruki} />
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border-b-8 border-orange-200 dark:border-orange-900">
          
          {/* Message Box */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl mb-6 border-2 border-dashed border-gray-200 dark:border-gray-700 min-h-[100px] relative">
             <div className="absolute -top-3 -left-2 bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-600">
               📢 お知らせ
             </div>
             <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {gameState.gameMessage}
             </p>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>🎒</span> Items
            </h3>
            <div className="flex flex-wrap gap-2">
              {gameState.items.length > 0 ? (
                gameState.items.map((item, index) => (
                  <div key={index} className="group relative cursor-help">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-lg border border-yellow-200 dark:border-yellow-800 shadow-sm hover:scale-110 transition-transform">
                      📦
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                      <div className="font-bold mb-1">{item.name}</div>
                      <div className="text-gray-300">{item.description}</div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic w-full text-center py-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  No Items
                </div>
              )}
            </div>
          </div>

          {/* Dice & Action */}
          <div className="relative">
            {showDice && (
               <div className="absolute bottom-full left-0 right-0 mb-4 flex justify-center z-10">
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border-4 border-blue-100 dark:border-blue-900 animate-bounce-in">
                    <DiceComponent 
                      isRolling={isRolling} 
                      finalValue={diceValue} 
                      onRollComplete={handleDiceRollComplete}
                    />
                 </div>
               </div>
            )}

            <button
                onClick={handleTakeTurn}
                disabled={isRolling || gameState.isFinished || isMoving || Boolean(gameState.pendingMoves && gameState.pendingMoves !== 0) || gameState.isEventWait}
                className={`
                  w-full relative overflow-hidden group
                  py-4 px-6 rounded-2xl font-black text-xl shadow-[0_6px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[6px] transition-all
                  ${isRolling || isMoving || (gameState.pendingMoves && gameState.pendingMoves !== 0) || gameState.isEventWait
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none translate-y-[6px]' 
                    : 'bg-gradient-to-b from-orange-400 to-orange-500 text-white hover:from-orange-300 hover:to-orange-400 shadow-orange-700'
                  }
                `}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isRolling ? '🎲 ...' : 
                   isMoving ? '🏃 ...' : 
                   (gameState.pendingMoves && gameState.pendingMoves !== 0) ? '⏳ ...' :
                   gameState.isEventWait ? '✨ ...' :
                   gameState.isResting > 0 ? '😴 休み' :
                   <><span>🎲</span> サイコロを振る</>}
                </span>
                
                {/* Button Shine Effect */}
                {!isRolling && !isMoving && (
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
                )}
            </button>
            
            {/* Status Text */}
            <div className="text-center mt-3 min-h-[20px]">
               {(isMoving || (gameState.pendingMoves && gameState.pendingMoves > 0)) && (
                 <span className="text-xs font-bold text-blue-500 animate-pulse">
                   移動中... 残り{gameState.pendingMoves}マス
                 </span>
               )}
               {gameState.isResting > 0 && (
                 <span className="text-xs font-bold text-red-500 animate-pulse">
                   あと{gameState.isResting}回休み
                 </span>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
