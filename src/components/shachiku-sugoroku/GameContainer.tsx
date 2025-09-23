"use client";

import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/sugoroku';
import { takeTurn } from '@/lib/sugoroku-logic';
import { GameBoard } from './GameBoard';
import { YarukiGauge } from './YarukiGauge';
import { ResultCard } from './ResultCard';
import { DiceComponent } from './DiceComponent';

interface GameContainerProps {
  initialState: GameState;
}

export const GameContainer: React.FC<GameContainerProps> = ({ initialState }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [showDice, setShowDice] = useState(false);

  const handleTakeTurn = () => {
    if (isRolling || gameState.isFinished) return;

    setIsRolling(true);
    setShowDice(true);
    
    // Generate dice value (1-6)
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
  };

  const handleDiceRollComplete = () => {
    // Calculate new game state after dice animation completes
    setTimeout(() => {
      const newState = takeTurn(gameState);
      setGameState(newState);
      setIsRolling(false);
      
      // Hide dice after a brief delay
      setTimeout(() => {
        setShowDice(false);
      }, 2000);
    }, 300);
  };

  if (gameState.isFinished) {
    return <ResultCard gameState={gameState} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
            🎯 社畜すごろく盤
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            ターン {gameState.turn}
          </div>
        </div>
        <GameBoard position={gameState.position} playerName={gameState.playerName} />
      </div>

      <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-fit">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          ステータス
        </h2>
        <div>
          <p><strong>プレイヤー:</strong> {gameState.playerName} ({gameState.job})</p>
          <p><strong>ターン:</strong> {gameState.turn}</p>
          <YarukiGauge value={gameState.yaruki} />
          <p><strong>休み:</strong> {gameState.isResting > 0 ? `${gameState.isResting}ターン` : 'なし'}</p>
        </div>

        <div className="mt-6">
            <h3 className="font-bold mb-2">アイテム</h3>
            {gameState.items.length > 0 ? (
                <ul>
                    {gameState.items.map((item, index) => <li key={index}>- {item.name}</li>)}
                </ul>
            ) : <p className="text-sm text-gray-500">なし</p>}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mb-4 h-24 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{gameState.gameMessage}</p>
            </div>
            
            {/* Dice Component */}
            {showDice && (
              <div className="mb-6 py-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600">
                <DiceComponent 
                  isRolling={isRolling} 
                  finalValue={diceValue} 
                  onRollComplete={handleDiceRollComplete}
                />
              </div>
            )}
            
            <button
                onClick={handleTakeTurn}
                disabled={isRolling || gameState.isFinished}
                className="w-full bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isRolling ? 'ローリング...' : 'サイコロを振る'}
            </button>
        </div>
      </div>
    </div>
  );
};
